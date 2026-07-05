# foundit-cli

CLI for searching jobs on **Foundit.in** (formerly Monster India) — one of India's
largest job portals, covering all major Indian cities and sectors.

**Data source**: Foundit public `middleware` JSON endpoints (`jobsearch` and `jobdetail/<id>`).
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** This uses Foundit's public API; keep volume low, don't use it
> commercially or for bulk data collection, and run it on your own responsibility.

## Installation

```bash
cd .agents/skills/foundit-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for job listings (needs `--query` and/or `--location`) |
| `detail` | Fetch full detail for a single job listing |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Backend roles in Hyderabad, last 7 days
bun run src/cli.ts search -q "backend engineer" -l hyderabad --jobage 7 --format table

# Fresher data analyst roles in Mumbai
bun run src/cli.ts search -q "data analyst" -l mumbai -e 0-1 --format table

# Product roles anywhere in India
bun run src/cli.ts search -q "product manager" --format table

# Full detail for one job
bun run src/cli.ts detail 57827235 --format plain
```

See `../SKILL.md` for the full flag reference and the personal-use note.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords (title / skill / role). At least one of query/location required. |
| `--location` | `-l` | City or region, e.g. `bangalore`, `mumbai`, `delhi`, `remote`. |
| `--jobage` | | Posted within N days: `1`, `3`, `7`, `15`, `30`. |
| `--experience` | `-e` | Years of experience: `0-1`, `2-5`, `10-15`, or a single number. |
| `--page` | | 1-indexed page. |
| `--limit` | `-n` | Results per page (max 100, default 15). |
| `--format` | | `json` \| `table` \| `plain`. |
