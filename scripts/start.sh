#!/bin/ash

set -euxo pipefail

nginx -g "daemon off;" &
deno run -A main.ts &
wait -n
exit $?