// Пакет docs встраивает Swagger UI и OpenAPI, чтобы документация не зависела от CDN.
package docs

import "embed"

//go:embed assets/* openapi.yaml index.html
var Files embed.FS
