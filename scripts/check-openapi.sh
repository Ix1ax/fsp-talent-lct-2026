#!/bin/sh
set -eu
# Корневой контракт копируется в Go-пакет для embed. CI не даст забыть эту копию.
cmp api/openapi.yaml apps/api/internal/httpapi/docs/openapi.yaml
