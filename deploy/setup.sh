#!/usr/bin/env bash
# Sets up the sheet's server on a fresh Ubuntu droplet (24.04 LTS), as root (docs/server.md):
#
#   sudo bash deploy/setup.sh <git URL of the repository> [domain]
#
# Installs Node.js 22 and Caddy, puts the code in /opt/sw5e-sheet (owned by root, read by the service), builds the
# web version, makes the "sheet" user that runs the server, its database folder /var/lib/sw5e-sheet, its settings
# /etc/sw5e-sheet.env (from deploy/sheet.env.example; kept if already there), the systemd service, Caddy's site,
# a nightly database backup and the firewall (SSH, HTTP, HTTPS). Running it again updates what it installed and keeps
# the settings and the database.
#
# A private repository: give the droplet read access first (a deploy key, docs/server.md), and use its SSH URL.
set -euo pipefail

REPO="${1:?usage: setup.sh <git URL> [domain]}"
DOMAIN="${2:-}"
APP=/opt/sw5e-sheet
DATA=/var/lib/sw5e-sheet
ENV_FILE=/etc/sw5e-sheet.env

[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }

echo "== Packages"
apt-get update -q
apt-get install -y -q git python3 curl ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https ufw sqlite3
if ! command -v node >/dev/null || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi
echo "node $(node --version), $(caddy version | cut -d' ' -f1)"

echo "== Code"
if [ -d "$APP/.git" ]; then
  git -C "$APP" pull --ff-only
else
  git clone "$REPO" "$APP"
fi
python3 "$APP/dev/build.py"

echo "== Service user, data, settings"
id sheet >/dev/null 2>&1 || useradd --system --home "$DATA" --shell /usr/sbin/nologin sheet
install -d -o sheet -g sheet -m 750 "$DATA" "$DATA/backups"
if [ ! -f "$ENV_FILE" ]; then
  install -o root -g sheet -m 640 "$APP/deploy/sheet.env.example" "$ENV_FILE"
  if [ -n "$DOMAIN" ]; then url="https://$DOMAIN"; else url="http://$(curl -fsS4 https://ifconfig.me || hostname -I | cut -d' ' -f1)"; fi
  sed -i "s|^PUBLIC_URL=.*|PUBLIC_URL=$url|" "$ENV_FILE"
  echo "Settings written to $ENV_FILE (PUBLIC_URL=$url): add Google's client id and secret there if wanted."
fi

echo "== Service"
install -m 644 "$APP/deploy/sw5e-sheet.service" /etc/systemd/system/sw5e-sheet.service
systemctl daemon-reload
systemctl enable sw5e-sheet
systemctl restart sw5e-sheet

echo "== Caddy"
site="${DOMAIN:-:80}"
sed "s|^SITE_ADDRESS {|$site {|" "$APP/deploy/Caddyfile" > /etc/caddy/Caddyfile
install -d -o caddy -g caddy /var/log/caddy
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "== Nightly database backup (14 kept, in $DATA/backups)"
cat > /etc/cron.d/sw5e-sheet-backup <<CRON
# The sheet's database, copied every night at 03:30 (server/admin.js backup); copies older than 14 days removed.
30 3 * * * sheet cd $APP && ENV_FILE=$ENV_FILE /usr/bin/node --disable-warning=ExperimentalWarning server/admin.js backup $DATA/backups/sheet-\$(date +\%F).db >/dev/null && find $DATA/backups -name 'sheet-*.db' -mtime +14 -delete
CRON

echo "== Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

sleep 2
if systemctl is-active --quiet sw5e-sheet; then
  echo "Done: $(grep '^PUBLIC_URL=' "$ENV_FILE" | cut -d= -f2-)"
else
  echo "The service didn't start: journalctl -u sw5e-sheet -n 50"; exit 1
fi
