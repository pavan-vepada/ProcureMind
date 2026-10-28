#!/usr/bin/env bash
# Runs the live extraction eval for each vendor in parallel. Usage: bash scripts/eval-all.sh [V1 V2 ...]
source ~/.nvm/nvm.sh
cd "$(dirname "$0")/.."
vendors=("${@:-V1 V2 V3 V4 V5}")
[ $# -eq 0 ] && vendors=(V1 V2 V3 V4 V5)
for v in "${vendors[@]}"; do
  RUN_EVAL=1 EVAL_VENDOR=$v NO_COLOR=1 npx vitest run tests/eval > "/tmp/eval-$v.log" 2>&1 &
done
wait
for v in "${vendors[@]}"; do
  echo "================ $v"
  grep -vE '^\s*$|RUN|Start at|Duration|Test Files|stdout \|' "/tmp/eval-$v.log" | grep -vE '^\s+(❯|\||[0-9]+\|)' | head -30
done
