#!/usr/bin/env bash
# deploy.sh — deploy บัญชีนวล to the DirectAdmin host. Idempotent: run as `admin`.
#   ssh admin@123.253.62.251 'bash -s' < deploy/deploy.sh
# or on the server: bash /home/admin/domains/hacc.xman4289.com/_src/deploy/deploy.sh
set -euo pipefail

DOMAIN_DIR="/home/admin/domains/hacc.xman4289.com"
REPO="https://github.com/xjanova/homeaccount.git"
SRC="$DOMAIN_DIR/_src"
WEB="$DOMAIN_DIR/public_html"
PRIVATE="$DOMAIN_DIR/private"
BRANCH="${1:-main}"

echo "==> 1/6 fetch source ($BRANCH)"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --depth 1 origin "$BRANCH"
  git -C "$SRC" reset --hard "origin/$BRANCH"
else
  rm -rf "$SRC"
  git clone --depth 1 -b "$BRANCH" "$REPO" "$SRC"
fi

echo "==> 2/6 private data dir"
mkdir -p "$PRIVATE"
chmod 700 "$PRIVATE"

echo "==> 3/6 sync web files"
# copy app into public_html (keep DirectAdmin cgi-bin; no --delete)
rsync -a --exclude '.git' "$SRC/public/" "$WEB/"

echo "==> 4/6 backend config"
if [ ! -f "$WEB/api/config.php" ]; then
  cp "$WEB/api/config.sample.php" "$WEB/api/config.php"
fi
chmod 600 "$WEB/api/config.php" || true

echo "==> 5/6 generate PWA icons"
php "$SRC/tools/make-icons.php" "$WEB/icons" || echo "  (icon gen skipped — GD missing?)"

echo "==> 6/6 init / migrate database"
php -r '$c = file_exists("'"$WEB"'/api/config.php") ? require "'"$WEB"'/api/config.php" : require "'"$WEB"'/api/config.sample.php"; require "'"$WEB"'/api/lib/Db.php"; Db::conn($c); echo "db ready: ".$c["db_path"]."\n";'
[ -f "$PRIVATE/app.sqlite" ] && chmod 600 "$PRIVATE/app.sqlite" || true

echo "==> DONE. https://hacc.xman4289.com"
