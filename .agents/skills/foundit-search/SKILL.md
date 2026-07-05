---
name: foundit-search
version: 1.0.0
description: >
  Make sure to use this skill whenever the user mentions anything related to job
  searching in India, Indian job listings, job vacancies in Indian cities, or the
  Indian job market — even if they don't mention foundit.in or Monster India
  explicitly. Invoke for open positions, hiring, and vacancies across any sector
  or role (IT, data, design, marketing, finance, operations, etc.) in India.
  Trigger phrases include: jobs in india, india job search, naukri, foundit,
  monster india, indian jobs, jobs in bangalore, jobs in bengaluru, jobs in
  mumbai, jobs in delhi, jobs in hyderabad, jobs in pune, jobs in chennai, jobs
  in gurgaon, jobs in noida, jobs in kolkata, software jobs india, IT jobs india,
  fresher jobs, fresher jobs india, data scientist job india, developer jobs
  india, remote jobs india, walk-in interview, walk in drive, off campus hiring,
  lakhs per annum, LPA salary, sarkari naukri alternatives, private jobs india.
context: fork
allowed-tools: Bash(bun run skills/foundit-search/cli/src/cli.ts *)
---

# Foundit Search Skill (India)

Search live job listings from **Foundit.in** (formerly Monster India), one of India's
largest job portals, covering all major Indian cities and sectors. No authentication,
no API key, and **zero runtime dependencies** — it runs with just `bun`.

> This is the India-market instance of the repo's job-portal-skill pattern, alongside
> the Danish portals and the country-agnostic `linkedin-search`. Foundit's public
> middleware API returns clean JSON, so no HTML parsing is needed.

## ⚠️ Personal use only

This uses Foundit's public middleware API (the same one its own search page calls).
**Keep volume low and don't use it commercially or for bulk data collection.**
Run it on your own responsibility.

## When to use this skill

- Search for job openings anywhere in India (Bengaluru, Mumbai, Delhi NCR, Hyderabad, Pune, Chennai, …) or remote
- Filter by recency (posted in the last 1/3/7/15/30 days) or years of experience (great for fresher searches: `-e 0-1`)
- Get the full description, required skills, salary, and applicant count for a specific job listing

## Commands

### Search job listings

```bash
bun run skills/foundit-search/cli/src/cli.ts search --query "<keywords>" [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended; at least one of `--query`/`--location` is required.
- `--location <text>` / `-l <text>` — city or region, e.g. `bangalore`, `mumbai`, `delhi`, `pune`, `hyderabad`, `chennai`, `remote`.
- `--jobage <days>` — posted within N days: `1`, `3`, `7`, `15`, `30`. Omit for all postings.
- `--experience <range>` / `-e <range>` — years of experience, e.g. `0-1` (freshers), `2-5`, `10-15`, or a single number like `3`.
- `--page <n>` — page number (1-indexed).
- `--limit <n>` / `-n <n>` — results per page (max 100, default 15).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run skills/foundit-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job ID from `search` results (e.g. `57827235`). You may also pass a full
foundit.in job URL. Returns the full description, required skills, experience range,
salary (when disclosed), employment type, industries, functions, and applicant count.

## Usage examples

```bash
# Python developer roles in Bengaluru, last 7 days
bun run skills/foundit-search/cli/src/cli.ts search -q "python developer" -l bangalore --jobage 7 --format table

# Fresher-friendly data analyst roles in Mumbai
bun run skills/foundit-search/cli/src/cli.ts search -q "data analyst" -l mumbai -e 0-1 --format table

# Product manager roles anywhere in India
bun run skills/foundit-search/cli/src/cli.ts search -q "product manager" --format table

# Full details for a specific job
bun run skills/foundit-search/cli/src/cli.ts detail 57827235 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is from Foundit's public `middleware` JSON endpoints — no credentials required.
- Salaries are frequently undisclosed on Indian portals; `salary` is `null` when hidden or `0-0 INR`.
- The API may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep volume low (see note above).
- Job IDs are numeric (e.g. `57827235`) — pass them as-is to `detail`.
- Naukri.com (India's biggest portal) fronts its API with reCAPTCHA, so it cannot be scripted without a headless browser; Foundit offers comparable India-wide coverage with a clean public JSON API.
