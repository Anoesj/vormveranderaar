#!/bin/bash

set -e

NITRO_PRESET=bun nuxt build

sed -i '/websocket: ws.websocket ,/a\  idleTimeout: 0, // NOTE: Manually added, see `build` script in package.json!' .output/server/index.mjs
