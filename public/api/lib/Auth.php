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
}
