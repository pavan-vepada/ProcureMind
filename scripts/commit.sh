#!/usr/bin/env bash
# Commits everything with the message in .git/COMMIT_MSG_TMP (avoids shell quoting problems from PowerShell).
set -e
cd "$(dirname "$0")/.."
rm -f .tmp-*.sh
git add -A
git commit -q -F .git/COMMIT_MSG_TMP
rm .git/COMMIT_MSG_TMP
git log --oneline -1
git status --short | head -5
