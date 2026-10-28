#!/usr/bin/env bash
# Unpacks the shared libraries headless Chromium needs into ~/.local/pw-libs, without sudo.
# Use with: export LD_LIBRARY_PATH=~/.local/pw-libs/usr/lib/x86_64-linux-gnu
set -e
BIN=$(ls -d ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | tail -1)
DEST=~/.local/pw-libs
mkdir -p "$DEST" /tmp/pw-debs
export LD_LIBRARY_PATH="$DEST/usr/lib/x86_64-linux-gnu:$DEST/lib/x86_64-linux-gnu"
for round in 1 2 3 4; do
  missing=$(ldd "$BIN" | awk '/not found/ {print $1}')
  [ -z "$missing" ] && { echo "all libraries present"; exit 0; }
  echo "round $round missing: $missing"
  pkgs=""
  for lib in $missing; do
    pkg=$(apt-file search -l "$lib" 2>/dev/null | head -1 || true)
    if [ -z "$pkg" ]; then
      case "$lib" in
        libnspr4*) pkg=libnspr4 ;; libnss3*|libnssutil3*|libsmime3*) pkg=libnss3 ;;
        libatk-1.0*) pkg=libatk1.0-0t64 ;; libatk-bridge*) pkg=libatk-bridge2.0-0t64 ;; libatspi*) pkg=libatspi2.0-0t64 ;;
        libcups*) pkg=libcups2t64 ;; libdrm*) pkg=libdrm2 ;; libxkbcommon*) pkg=libxkbcommon0 ;;
        libXcomposite*) pkg=libxcomposite1 ;; libXdamage*) pkg=libxdamage1 ;; libXfixes*) pkg=libxfixes3 ;;
        libXrandr*) pkg=libxrandr2 ;; libgbm*) pkg=libgbm1 ;; libasound*) pkg=libasound2t64 ;;
        libpango*) pkg=libpango-1.0-0 ;; libcairo*) pkg=libcairo2 ;; libX11*) pkg=libx11-6 ;; libXext*) pkg=libxext6 ;;
        libxcb.so*) pkg=libxcb1 ;; libXi*) pkg=libxi6 ;; libavahi*) pkg=libavahi-client3 ;; libwayland*) pkg=libwayland-server0 ;;
        *) echo "don't know package for $lib"; continue ;;
      esac
    fi
    pkgs="$pkgs $pkg"
  done
  (cd /tmp/pw-debs && apt-get download $pkgs 2>&1 | tail -2)
  for d in /tmp/pw-debs/*.deb; do dpkg -x "$d" "$DEST"; done
done
ldd "$BIN" | awk '/not found/ {print "still missing:", $1}'
