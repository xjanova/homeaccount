<?php
// config.sample.php — copy to config.php on the server (config.php is gitignored).
// All values have safe defaults; override only what you need.
return [
  // SQLite file — MUST live OUTSIDE public_html. Default: <domain>/private/app.sqlite
  'db_path'   => __DIR__ . '/../../private/app.sqlite',
  // token lifetime (seconds) — 60 days
  'token_ttl' => 60 * 24 * 3600,
  // allow new sign-ups
  'allow_register' => true,
  // brute-force throttle: max failed auth attempts per IP per window
  'auth_max_attempts' => 8,
  'auth_window_sec'   => 600,
  // Google Sign-In: paste your OAuth 2.0 *Web* client ID here to enable the
  // "ดำเนินการต่อด้วย Google" button. Leave '' to keep it hidden (no dead button).
  // Create at https://console.cloud.google.com/apis/credentials and add
  // https://hacc.xman4289.com to "Authorized JavaScript origins".
  'google_client_id' => '',
];
