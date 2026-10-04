#!/bin/sh
set -eu
if [ -n "${API_UPSTREAM:-}" ]; then
  case "$API_UPSTREAM" in
    https://*) ;;
    *) echo "API_UPSTREAM must be an HTTPS origin" >&2; exit 1 ;;
  esac
  mkdir -p /etc/nginx/templates
  cp /opt/hemodinks/nginx.proxy.conf.template /etc/nginx/templates/default.conf.template
fi
