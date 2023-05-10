#!/bin/ash

set -euxo pipefail

nginx -g "daemon off;" &
deno run -A app/main.ts &
wait -n
exit $?