#!/usr/bin/env bash
# Studio / Apps — Start Script
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=================================================="
echo " Starting Studio / Apps SQLite Server..."
echo "=================================================="
node server.js
