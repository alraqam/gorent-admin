#!/bin/sh
# Runs at container start (before nginx). Writes a tiny JS config file so the
# API URL is a real runtime env var — no image rebuild needed to change it.
cat > /usr/share/nginx/html/env.js <<EOF
window.__GORENT_CONFIG__ = {
  apiUrl: "${API_URL:-http://localhost:3001/api}"
};
EOF
