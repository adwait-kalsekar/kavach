#!/bin/sh
set -eu
: "${API_ORIGIN:?Set the exact API_ORIGIN before starting the web service}"
# Reject template/code/header injection before nginx envsubst runs.
# grep is line-based: reject newlines and all non-URL characters first.
case "$API_ORIGIN$PORT$RELEASE_SHA" in
  *[!a-zA-Z0-9:./-]*) echo "Invalid web configuration characters" >&2; exit 1 ;;
esac
printf '%s' "$API_ORIGIN" | grep -Eq '^https?://[a-zA-Z0-9.-]+(:[0-9]{1,5})?$' || { echo 'Invalid API_ORIGIN' >&2; exit 1; }
printf '%s' "$PORT" | grep -Eq '^[0-9]{1,5}$' && [ "$PORT" -gt 0 ] && [ "$PORT" -le 65535 ] || exit 1
printf '%s' "$RELEASE_SHA" | grep -Eq '^(development|[a-f0-9]{40})$' || exit 1
