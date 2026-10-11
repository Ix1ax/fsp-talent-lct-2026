package migrations

import "embed"

//go:embed *.sql
var Files embed.FS

// Demo migrations have a separate history and run automatically after schema migrations.
//
//go:embed demo/*.sql
var DemoFiles embed.FS
