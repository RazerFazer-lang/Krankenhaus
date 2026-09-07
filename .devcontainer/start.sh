#!/usr/bin/env bash
set -e

PID_FILE="/tmp/krankenhaus.pid"
LOG_FILE="/tmp/krankenhaus.log"
BUILD_LOG="/tmp/krankenhaus-build.log"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi

npm run build >"$BUILD_LOG" 2>&1
nohup npm start >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
