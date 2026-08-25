#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BE_STACK_CONTROL="$SCRIPT_DIR/../SHRESTA-EXCLUSIVE-BE/stack-control.sh"

if [[ ! -x "$BE_STACK_CONTROL" ]]; then
  echo "ERROR: Backend stack controller not found or not executable: $BE_STACK_CONTROL" >&2
  exit 1
fi

exec "$BE_STACK_CONTROL" "$@"