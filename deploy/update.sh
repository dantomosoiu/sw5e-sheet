#!/usr/bin/env bash
# Updates the sheet's server on the droplet to the repository's latest main (docs/server.md), as root:
#
#   sudo bash /opt/sw5e-sheet/deploy/update.sh
#
# Pulls, checks the server (dev/server-check.js, on a temporary database), builds the web version and restarts the
# service. Nothing changes when the check fails. Players get the new version of the sheet the next time they open it
# ("A new version of the sheet is ready").
set -euo pipefail
APP=/opt/sw5e-sheet
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo)."; exit 1; }
before=$(git -C "$APP" rev-parse HEAD)
git -C "$APP" pull --ff-only
if ! node --disable-warning=ExperimentalWarning "$APP/dev/server-check.js" >/tmp/sheet-server-check.txt; then
  cat /tmp/sheet-server-check.txt
  git -C "$APP" reset --hard "$before"
  echo "The server check failed: kept the version that was running ($before)."; exit 1
fi
python3 "$APP/dev/build.py"
install -m 644 "$APP/deploy/sw5e-sheet.service" /etc/systemd/system/sw5e-sheet.service
systemctl daemon-reload
systemctl restart sw5e-sheet
sleep 2
systemctl is-active --quiet sw5e-sheet && echo "Updated to $(git -C "$APP" log --oneline -1)." || { echo "Not running: journalctl -u sw5e-sheet -n 50"; exit 1; }
