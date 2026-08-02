#!/bin/sh
# Runs at container start (before nginx). Writes a tiny JS config file so the
# API URL is a real runtime env var — no image rebuild needed to change it.
#
# EIMZO_KEYS: the domain/API-key pairs E-IMZO issues for this deployment, given
# as "domain1:key1,domain2:key2". The agent refuses EVERY operation for a domain
# it has no key for ("API-key для домена … недействителен"), so signing cannot
# work until E-IMZO has registered the domain the admin is served from.
EIMZO_JSON="[]"
if [ -n "$EIMZO_KEYS" ]; then
  EIMZO_JSON=$(printf '%s' "$EIMZO_KEYS" | awk -F, '{
    printf "[";
    for (i = 1; i <= NF; i++) {
      split($i, kv, ":");
      printf "%s\"%s\",\"%s\"", (i > 1 ? "," : ""), kv[1], kv[2];
    }
    printf "]";
  }')
fi

cat > /usr/share/nginx/html/env.js <<CONFIG
window.__GORENT_CONFIG__ = {
  apiUrl: "${API_URL:-http://localhost:3001/api}"
};
window.EIMZO_KEYS = ${EIMZO_JSON};
CONFIG
