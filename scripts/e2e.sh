#!/usr/bin/env bash
# Builds the app and runs the end-to-end demo path in a real browser. Screenshots: test-results/shots/
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
# Browser libraries unpacked without sudo by scripts/browser-libs.sh.
export LD_LIBRARY_PATH="$HOME/.local/pw-libs/usr/lib/x86_64-linux-gnu:$HOME/.local/pw-libs/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
mkdir -p test-results/shots
[ "$1" = "--no-build" ] || npx next build > /tmp/pm-build.log 2>&1 || { tail -30 /tmp/pm-build.log; exit 1; }
npx playwright test 2>&1 | tail -40
node scripts/cleanup-test-users.mjs
