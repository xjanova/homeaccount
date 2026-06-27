<?php
// Db.php — PDO/SQLite connection + schema migration
class Db {
  private static ?PDO $pdo = null;

  static function conn(array $cfg): PDO {
    if(self::$pdo) return self::$pdo;
    $path = $cfg['db_path'];
    $dir = dirname($path);
    if(!is_dir($dir)) @mkdir($dir, 0700, true);
    $pdo = new PDO('sqlite:' . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec('PRAGMA journal_mode=WAL');
    $pdo->exec('PRAGMA foreign_keys=ON');
    $pdo->exec('PRAGMA busy_timeout=4000');
    self::$pdo = $pdo;
    self::migrate($pdo);
    return $pdo;
  }

  static function migrate(PDO $db): void {
    $db->exec(<<<SQL
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '', plan TEXT NOT NULL DEFAULT 'free',
        household_id TEXT, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS households (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free', seats INTEGER NOT NULL DEFAULT 5,
        billing_cycle TEXT NOT NULL DEFAULT 'monthly', created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS household_members (
        household_id TEXT NOT NULL, user_id TEXT, role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active', invited_email TEXT, name TEXT, created_at INTEGER NOT NULL,
        PRIMARY KEY (household_id, user_id, invited_email)
      );
      CREATE TABLE IF NOT EXISTS tokens (
        token TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS records (
        household_id TEXT NOT NULL, store TEXT NOT NULL, id TEXT NOT NULL,
        data TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (household_id, store, id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_sync ON records(household_id, updated_at);
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, household_id TEXT NOT NULL, date INTEGER NOT NULL,
        amount INTEGER NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'paid'
      );
      CREATE TABLE IF NOT EXISTS auth_attempts (
        ip TEXT NOT NULL, ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_attempts_ip ON auth_attempts(ip, ts);
    SQL);
  }
}
