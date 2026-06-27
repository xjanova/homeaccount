<?php
// Http.php — request parsing, JSON responses, auth/session helpers
class Http {
  static function path(): string {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    // strip everything up to and including '/api/'
    $i = strpos($uri, '/api/');
    $p = $i === false ? $uri : substr($uri, $i + 5);
    return '/' . trim($p, '/');
  }
  static function method(): string { return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'); }
  static function body(): array {
    $raw = file_get_contents('php://input');
    if($raw === '' || $raw === false) return [];
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
  }
  static function bearer(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if(!$h && function_exists('getallheaders')){ foreach(getallheaders() as $k=>$v){ if(strtolower($k)==='authorization'){ $h=$v; break; } } }
    if(preg_match('/Bearer\s+(.+)/i', $h, $m)) return trim($m[1]);
    return null;
  }
  static function ip(): string {
    return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
  }
  static function json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }
  static function fail(string $code, string $message, int $http = 400): void {
    self::json(['error' => $code, 'message' => $message], $http);
  }
  // require a valid session; returns [user, household] or 401
  static function requireUser(PDO $db): array {
    $tok = self::bearer();
    if(!$tok) self::fail('unauthorized', 'ต้องเข้าสู่ระบบ', 401);
    $row = $db->prepare('SELECT user_id, expires_at FROM tokens WHERE token = ?');
    $row->execute([$tok]);
    $t = $row->fetch();
    if(!$t || $t['expires_at'] < time()) self::fail('unauthorized', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่', 401);
    $u = $db->prepare('SELECT * FROM users WHERE id = ?'); $u->execute([$t['user_id']]);
    $user = $u->fetch();
    if(!$user) self::fail('unauthorized', 'ไม่พบผู้ใช้', 401);
    $hh = null;
    if($user['household_id']){ $h=$db->prepare('SELECT * FROM households WHERE id=?'); $h->execute([$user['household_id']]); $hh=$h->fetch() ?: null; }
    return [$user, $hh];
  }
}
