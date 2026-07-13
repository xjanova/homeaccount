<?php
// Auth.php — registration, login, tokens, brute-force throttle
class Auth {
  static function uid(): string { return bin2hex(random_bytes(12)); }
  static function token(): string { return bin2hex(random_bytes(24)); }

  static function throttle(PDO $db, array $cfg): void {
    $ip = Http::ip(); $win = $cfg['auth_window_sec']; $max = $cfg['auth_max_attempts'];
    $db->prepare('DELETE FROM auth_attempts WHERE ts < ?')->execute([time() - $win]);
    $c = $db->prepare('SELECT COUNT(*) c FROM auth_attempts WHERE ip = ? AND ts > ?');
    $c->execute([$ip, time() - $win]);
    if((int)$c->fetch()['c'] >= $max) Http::fail('too_many', 'พยายามเข้าสู่ระบบบ่อยเกินไป ลองใหม่ภายหลัง', 429);
  }
  static function recordAttempt(PDO $db): void {
    $db->prepare('INSERT INTO auth_attempts(ip, ts) VALUES(?, ?)')->execute([Http::ip(), time()]);
  }

  static function issueToken(PDO $db, string $userId, int $ttl): array {
    $tok = self::token(); $now = time();
    $db->prepare('INSERT INTO tokens(token,user_id,created_at,expires_at) VALUES(?,?,?,?)')
       ->execute([$tok, $userId, $now, $now + $ttl]);
    // prune expired
    $db->prepare('DELETE FROM tokens WHERE expires_at < ?')->execute([$now]);
    return ['token' => $tok, 'expires_at' => $now + $ttl];
  }

  static function publicUser(array $u): array {
    return ['id'=>$u['id'], 'email'=>$u['email'], 'name'=>$u['name'], 'plan'=>$u['plan'], 'household_id'=>$u['household_id']];
  }
  static function publicHousehold(?array $h): ?array {
    if(!$h) return null;
    return ['id'=>$h['id'], 'name'=>$h['name'], 'plan'=>$h['plan'], 'seats'=>(int)$h['seats'], 'owner_id'=>$h['owner_id'], 'billing_cycle'=>$h['billing_cycle']];
  }

  static function register(PDO $db, array $cfg, array $in): void {
    if(empty($cfg['allow_register'])) Http::fail('disabled', 'ปิดรับสมัครชั่วคราว', 403);
    self::throttle($db, $cfg);
    $email = strtolower(trim($in['email'] ?? ''));
    $pass  = (string)($in['password'] ?? '');
    $name  = trim($in['name'] ?? '') ?: explode('@', $email)[0];
    if(!filter_var($email, FILTER_VALIDATE_EMAIL)) Http::fail('bad_email', 'อีเมลไม่ถูกต้อง');
    if(strlen($pass) < 6) Http::fail('weak_pass', 'รหัสผ่านอย่างน้อย 6 ตัวอักษร');
    $ex = $db->prepare('SELECT id FROM users WHERE email = ?'); $ex->execute([$email]);
    if($ex->fetch()){ self::recordAttempt($db); Http::fail('exists', 'อีเมลนี้ถูกใช้แล้ว', 409); }

    $now = time(); $uid = self::uid(); $hid = self::uid();
    $hash = password_hash($pass, PASSWORD_DEFAULT);
    $db->beginTransaction();
    try{
      // every user gets a household (owner). plan starts free → upgrade enables sync.
      $db->prepare('INSERT INTO households(id,name,owner_id,plan,seats,billing_cycle,created_at) VALUES(?,?,?,?,?,?,?)')
         ->execute([$hid, 'บ้านของ '.$name, $uid, 'free', 5, 'monthly', $now]);
      $db->prepare('INSERT INTO users(id,email,password_hash,name,plan,household_id,created_at) VALUES(?,?,?,?,?,?,?)')
         ->execute([$uid, $email, $hash, $name, 'free', $hid, $now]);
      $db->prepare('INSERT INTO household_members(household_id,user_id,role,status,invited_email,name,created_at) VALUES(?,?,?,?,?,?,?)')
         ->execute([$hid, $uid, 'owner', 'active', null, $name, $now]);
      $db->commit();
    }catch(Throwable $e){ $db->rollBack(); Http::fail('server', 'สมัครไม่สำเร็จ', 500); }

    $u = $db->prepare('SELECT * FROM users WHERE id=?'); $u->execute([$uid]); $user=$u->fetch();
    $h = $db->prepare('SELECT * FROM households WHERE id=?'); $h->execute([$hid]); $hh=$h->fetch();
    $t = self::issueToken($db, $uid, $cfg['token_ttl']);
    Http::json(['token'=>$t['token'], 'user'=>self::publicUser($user), 'household'=>self::publicHousehold($hh)]);
  }

  static function login(PDO $db, array $cfg, array $in): void {
    self::throttle($db, $cfg);
    $email = strtolower(trim($in['email'] ?? ''));
    $pass  = (string)($in['password'] ?? '');
    $q = $db->prepare('SELECT * FROM users WHERE email = ?'); $q->execute([$email]);
    $user = $q->fetch();
    if(!$user || !password_verify($pass, $user['password_hash'])){
      self::recordAttempt($db);
      Http::fail('bad_creds', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 401);
    }
    if(password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)){
      $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($pass, PASSWORD_DEFAULT), $user['id']]);
    }
    $hh = null;
    if($user['household_id']){ $h=$db->prepare('SELECT * FROM households WHERE id=?'); $h->execute([$user['household_id']]); $hh=$h->fetch() ?: null; }
    $t = self::issueToken($db, $user['id'], $cfg['token_ttl']);
    Http::json(['token'=>$t['token'], 'user'=>self::publicUser($user), 'household'=>self::publicHousehold($hh)]);
  }

  // ---- Google Sign-In: verify the ID token, then link/create a passwordless user ----
  static function google(PDO $db, array $cfg, array $in): void {
    $clientId = trim((string)($cfg['google_client_id'] ?? ''));
    if($clientId === '') Http::fail('disabled', 'ยังไม่ได้เปิดใช้งานการเข้าสู่ระบบด้วย Google', 403);
    self::throttle($db, $cfg);
    $credential = (string)($in['credential'] ?? '');
    if($credential === '') Http::fail('bad_token', 'ไม่พบข้อมูลจาก Google');

    $p = self::verifyGoogleIdToken($credential, $clientId);
    if(!$p){ self::recordAttempt($db); Http::fail('bad_token', 'ยืนยันตัวตนกับ Google ไม่สำเร็จ', 401); }

    $email = strtolower(trim($p['email'] ?? ''));
    $sub   = (string)($p['sub'] ?? '');
    $name  = trim($p['name'] ?? '') ?: (explode('@', $email)[0] ?: 'ผู้ใช้');
    if($email === '' || $sub === '') Http::fail('bad_token', 'ข้อมูลบัญชี Google ไม่ครบถ้วน', 401);

    // match by google_sub first (stable), then by email (link an existing password account)
    $q = $db->prepare('SELECT * FROM users WHERE google_sub = ?'); $q->execute([$sub]); $user = $q->fetch();
    if(!$user){ $q = $db->prepare('SELECT * FROM users WHERE email = ?'); $q->execute([$email]); $user = $q->fetch() ?: null; }

    if($user){
      if(empty($user['google_sub'])) $db->prepare('UPDATE users SET google_sub=? WHERE id=?')->execute([$sub, $user['id']]);
    } else {
      if(empty($cfg['allow_register'])) Http::fail('disabled', 'ปิดรับสมัครชั่วคราว', 403);
      $now = time(); $uid = self::uid(); $hid = self::uid();
      // Google users have no usable password — store a random hash so login-by-password can't succeed.
      $hash = password_hash(bin2hex(random_bytes(18)), PASSWORD_DEFAULT);
      $db->beginTransaction();
      try{
        $db->prepare('INSERT INTO households(id,name,owner_id,plan,seats,billing_cycle,created_at) VALUES(?,?,?,?,?,?,?)')
           ->execute([$hid, 'บ้านของ '.$name, $uid, 'free', 5, 'monthly', $now]);
        $db->prepare('INSERT INTO users(id,email,password_hash,name,plan,household_id,google_sub,created_at) VALUES(?,?,?,?,?,?,?,?)')
           ->execute([$uid, $email, $hash, $name, 'free', $hid, $sub, $now]);
        $db->prepare('INSERT INTO household_members(household_id,user_id,role,status,invited_email,name,created_at) VALUES(?,?,?,?,?,?,?)')
           ->execute([$hid, $uid, 'owner', 'active', null, $name, $now]);
        $db->commit();
      }catch(Throwable $e){ $db->rollBack(); Http::fail('server', 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ', 500); }
      $q = $db->prepare('SELECT * FROM users WHERE id=?'); $q->execute([$uid]); $user = $q->fetch();
    }

    $hh = null;
    if($user['household_id']){ $h=$db->prepare('SELECT * FROM households WHERE id=?'); $h->execute([$user['household_id']]); $hh=$h->fetch() ?: null; }
    $t = self::issueToken($db, $user['id'], $cfg['token_ttl']);
    Http::json(['token'=>$t['token'], 'user'=>self::publicUser($user), 'household'=>self::publicHousehold($hh)]);
  }

  // Verify a Google ID token via Google's tokeninfo endpoint (validates signature + expiry),
  // then enforce audience + issuer + verified-email. Returns the payload or null.
  static function verifyGoogleIdToken(string $idToken, string $clientId): ?array {
    if(!preg_match('/^[\w\-]+\.[\w\-]+\.[\w\-]+$/', $idToken)) return null; // JWT shape guard
    $raw = self::httpGet('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($idToken));
    if($raw === null) return null;
    $p = json_decode($raw, true);
    if(!is_array($p)) return null;
    if(!hash_equals($clientId, (string)($p['aud'] ?? ''))) return null;          // must be OUR client id
    $iss = $p['iss'] ?? '';
    if($iss !== 'accounts.google.com' && $iss !== 'https://accounts.google.com') return null;
    $ev = $p['email_verified'] ?? false;
    if($ev !== true && $ev !== 'true') return null;                              // verified email only
    if(isset($p['exp']) && (int)$p['exp'] < time()) return null;                 // not expired
    return $p;
  }

  // minimal HTTPS GET (curl if available, else stream wrapper). Returns body or null.
  static function httpGet(string $url): ?string {
    if(function_exists('curl_init')){
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_USERAGENT      => 'moneynual/1.0',
      ]);
      $res = curl_exec($ch);
      $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      return ($res === false || $code !== 200) ? null : (string)$res;
    }
    $ctx = stream_context_create([
      'http' => ['timeout' => 8, 'header' => "User-Agent: moneynual/1.0\r\n"],
      'ssl'  => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $res = @file_get_contents($url, false, $ctx);
    return $res === false ? null : $res;
  }
}
