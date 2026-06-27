<?php
// index.php — บัญชีนวล API front controller (PHP 8 + SQLite, local-first sync)
declare(strict_types=1);
error_reporting(E_ALL);
ini_set('display_errors', '0');   // never leak stack traces to clients
mb_internal_encoding('UTF-8');

require __DIR__ . '/lib/Db.php';
require __DIR__ . '/lib/Http.php';
require __DIR__ . '/lib/Auth.php';

$cfg = file_exists(__DIR__.'/config.php') ? require __DIR__.'/config.php' : require __DIR__.'/config.sample.php';

set_exception_handler(function(Throwable $e){
  error_log('[moneynual-api] '.$e->getMessage().' @ '.$e->getFile().':'.$e->getLine());
  Http::fail('server', 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', 500);
});

try { $db = Db::conn($cfg); }
catch(Throwable $e){ error_log('[moneynual-api] db: '.$e->getMessage()); Http::fail('db', 'ฐานข้อมูลไม่พร้อมใช้งาน', 500); }

$path = Http::path();
$method = Http::method();
$SYNC_STORES = ['tx','accounts','recurring','notes'];

// require pro plan for online sync / household features
function requirePro(array $user): void {
  if(($user['plan'] ?? 'free') !== 'pro') Http::fail('upgrade', 'ฟีเจอร์นี้ต้องใช้แพ็กโปร', 402);
}

switch(true){

  case $path === '/health' && $method === 'GET':
    Http::json(['ok'=>true, 'time'=>time(), 'service'=>'moneynual', 'php'=>PHP_VERSION]);

  case $path === '/auth/register' && $method === 'POST':
    Auth::register($db, $cfg, Http::body());

  case $path === '/auth/login' && $method === 'POST':
    Auth::login($db, $cfg, Http::body());

  case $path === '/me' && $method === 'GET': {
    [$user,$hh] = Http::requireUser($db);
    Http::json(['user'=>Auth::publicUser($user), 'household'=>Auth::publicHousehold($hh)]);
  }

  // ---------------- SYNC ----------------
  case $path === '/sync/pull' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db); requirePro($user);
    $since = (int)(Http::body()['since'] ?? 0);
    $st = $db->prepare('SELECT store,id,data,updated_at,deleted FROM records WHERE household_id=? AND updated_at>? ORDER BY updated_at ASC');
    $st->execute([$user['household_id'], $since]);
    $out = []; foreach($SYNC_STORES as $s) $out[$s] = [];
    foreach($st as $r){ if(!isset($out[$r['store']])) continue; $obj = json_decode($r['data'], true) ?: []; $obj['updatedAt']=(int)$r['updated_at']; $obj['deleted']=(int)$r['deleted']; $out[$r['store']][] = $obj; }
    Http::json(['records'=>$out, 'serverTime'=>self_now()]);
  }

  case $path === '/sync/push' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db); requirePro($user);
    $records = Http::body()['records'] ?? [];
    $hid = $user['household_id'];
    $applied = 0;
    $sel = $db->prepare('SELECT updated_at FROM records WHERE household_id=? AND store=? AND id=?');
    $up  = $db->prepare('INSERT INTO records(household_id,store,id,data,updated_at,deleted) VALUES(?,?,?,?,?,?)
                         ON CONFLICT(household_id,store,id) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at, deleted=excluded.deleted');
    $db->beginTransaction();
    try{
      foreach($SYNC_STORES as $store){
        foreach(($records[$store] ?? []) as $obj){
          if(empty($obj['id'])) continue;
          $uat = (int)($obj['updatedAt'] ?? 0);
          $del = (int)(!empty($obj['deleted']) ? 1 : 0);
          $sel->execute([$hid,$store,$obj['id']]); $cur = $sel->fetch();
          if($cur && (int)$cur['updated_at'] > $uat) continue;     // LWW: keep newer
          $up->execute([$hid,$store,$obj['id'], json_encode($obj, JSON_UNESCAPED_UNICODE), $uat ?: self_now(), $del]);
          $applied++;
        }
      }
      $db->commit();
    }catch(Throwable $e){ $db->rollBack(); throw $e; }
    Http::json(['ok'=>true, 'applied'=>$applied, 'serverTime'=>self_now()]);
  }

  // ---------------- HOUSEHOLD ----------------
  case $path === '/household/members' && $method === 'GET': {
    [$user,$hh] = Http::requireUser($db);
    Http::json(['members'=>household_members($db, $user['household_id']), 'seats'=>$hh? (int)$hh['seats'] : 5]);
  }

  case $path === '/household/invite' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db); requirePro($user);
    $email = strtolower(trim(Http::body()['email'] ?? ''));
    if(!filter_var($email, FILTER_VALIDATE_EMAIL)) Http::fail('bad_email','อีเมลไม่ถูกต้อง');
    $cnt = $db->prepare('SELECT COUNT(*) c FROM household_members WHERE household_id=?'); $cnt->execute([$user['household_id']]);
    if((int)$cnt->fetch()['c'] >= (int)($hh['seats'] ?? 5)) Http::fail('full','ที่นั่งเต็มแล้ว');
    // link to existing user if present
    $u = $db->prepare('SELECT id,name FROM users WHERE email=?'); $u->execute([$email]); $exist=$u->fetch();
    $db->prepare('INSERT OR IGNORE INTO household_members(household_id,user_id,role,status,invited_email,name,created_at) VALUES(?,?,?,?,?,?,?)')
       ->execute([$user['household_id'], $exist['id'] ?? null, 'member', $exist? 'active':'pending', $email, $exist['name'] ?? $email, time()]);
    if($exist) $db->prepare('UPDATE users SET household_id=? WHERE id=? AND household_id IS NULL')->execute([$user['household_id'], $exist['id']]);
    Http::json(['ok'=>true, 'members'=>household_members($db, $user['household_id'])]);
  }

  case $path === '/household/role' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db); requirePro($user);
    if($hh['owner_id'] !== $user['id']) Http::fail('forbidden','เฉพาะเจ้าของเท่านั้น',403);
    $b = Http::body();
    $db->prepare('UPDATE household_members SET role=? WHERE household_id=? AND user_id=? AND role<>\'owner\'')
       ->execute([in_array($b['role']??'',['admin','member'])?$b['role']:'member', $user['household_id'], $b['userId']??'']);
    Http::json(['ok'=>true, 'members'=>household_members($db, $user['household_id'])]);
  }

  case $path === '/household/remove' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db); requirePro($user);
    if($hh['owner_id'] !== $user['id']) Http::fail('forbidden','เฉพาะเจ้าของเท่านั้น',403);
    $uid = Http::body()['userId'] ?? '';
    $db->prepare('DELETE FROM household_members WHERE household_id=? AND user_id=? AND role<>\'owner\'')->execute([$user['household_id'], $uid]);
    $db->prepare('UPDATE users SET household_id=NULL WHERE id=? AND household_id=?')->execute([$uid, $user['household_id']]);
    Http::json(['ok'=>true, 'members'=>household_members($db, $user['household_id'])]);
  }

  // ---------------- BILLING (demo — no real payment gateway) ----------------
  case $path === '/billing/plan' && $method === 'POST': {
    [$user,$hh] = Http::requireUser($db);
    $b = Http::body();
    $plan = in_array($b['plan']??'',['free','pro']) ? $b['plan'] : 'free';
    $cycle= in_array($b['cycle']??'',['monthly','yearly']) ? $b['cycle'] : 'monthly';
    $db->prepare('UPDATE users SET plan=? WHERE id=?')->execute([$plan, $user['id']]);
    if($hh && $hh['owner_id']===$user['id']) $db->prepare('UPDATE households SET plan=?, billing_cycle=? WHERE id=?')->execute([$plan,$cycle,$hh['id']]);
    if($plan==='pro'){
      $amount = $cycle==='yearly' ? 1490 : 149;
      $db->prepare('INSERT INTO invoices(id,household_id,date,amount,plan,status) VALUES(?,?,?,?,?,?)')
         ->execute(['INV-'.strtoupper(substr(bin2hex(random_bytes(3)),0,6)), $user['household_id'], time(), $amount, 'โปร · '.($cycle==='yearly'?'รายปี':'รายเดือน'), 'paid']);
    }
    $u=$db->prepare('SELECT * FROM users WHERE id=?'); $u->execute([$user['id']]); $user=$u->fetch();
    $h=$db->prepare('SELECT * FROM households WHERE id=?'); $h->execute([$user['household_id']]); $hh=$h->fetch()?:null;
    Http::json(['ok'=>true, 'user'=>Auth::publicUser($user), 'household'=>Auth::publicHousehold($hh)]);
  }

  case $path === '/billing/invoices' && $method === 'GET': {
    [$user,$hh] = Http::requireUser($db);
    $q=$db->prepare('SELECT id,date,amount,plan,status FROM invoices WHERE household_id=? ORDER BY date DESC LIMIT 24');
    $q->execute([$user['household_id']]);
    Http::json(['invoices'=>$q->fetchAll()]);
  }

  default:
    Http::fail('not_found', 'ไม่พบ endpoint', 404);
}

function self_now(): int { return (int)round(microtime(true) * 1000); } // ms, matches client Date.now()
function household_members(PDO $db, ?string $hid): array {
  if(!$hid) return [];
  $q = $db->prepare('SELECT m.user_id, m.role, m.status, m.invited_email, COALESCE(u.name, m.name, m.invited_email) name, u.email
                     FROM household_members m LEFT JOIN users u ON u.id=m.user_id WHERE m.household_id=? ORDER BY (m.role=\'owner\') DESC, m.created_at ASC');
  $q->execute([$hid]);
  return array_map(function($r){
    return ['userId'=>$r['user_id'], 'name'=>$r['name'], 'email'=>$r['email'] ?: $r['invited_email'],
            'role'=>$r['role'], 'status'=>$r['status'], 'pending'=>$r['status']==='pending'?1:0];
  }, $q->fetchAll());
}
