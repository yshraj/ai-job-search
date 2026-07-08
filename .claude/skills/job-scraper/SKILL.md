---
name: job-scraper
description: >
  Finds new job postings matching your profile via installed portal-search CLIs
  (LinkedIn, local job boards, and any skills added with /add-portal). Deduplicates
  across runs. Triggers on: job scrape, find jobs, search jobs, new jobs, job search,
  scrape jobs, /scrape
allowed-tools: Read, Write, Edit, Glob, Grep, WebFetch, WebSearch, Agent, AskUserQuestion, Bash(bun run .agents/skills/*-search/cli/src/cli.ts *)
---

# Job Scraper

---

## How It Works

This skill searches job portals using the **installed portal-search CLIs** in
`.agents/skills/` (plus WebSearch as a fallback), using queries from your profile.
It deduplicates against previously seen jobs and the application tracker, and
presents new matches with a quick fit assessment.

## Invocation

The user triggers this skill by saying things like:
- "Find new jobs"
- "Scrape for jobs"
- "Any new positions?"
- "/scrape"

Optional arguments:
- A focus area, e.g. "/scrape data science" or "/scrape geophysics"
- "broad" to run all search categories, e.g. "/scrape broad"

---

## Execution Steps

### Step 0: Load State

1. Read `job_scraper/seen_jobs.json` (create if missing - start with `{"seen": {}}`)
2. Read `job_search_tracker.csv` to extract already-applied companies+roles
3. Read `search-queries.md` (this directory) for the search strategy

### Step 1: Search

**Primary path — portal CLIs (preferred).** Before any WebSearch, discover which
portal-search skills are installed:

```bash
# List installed portal skills (any folder matching *-search with a cli/)
ls .agents/skills/*-search/cli/src/cli.ts
```

For each installed skill, read its `SKILL.md` for flags, then run live searches
mapped from `search-queries.md` priority categories. By default, run Priority 1–3;
if the user said `broad`, run all categories.

**Query → CLI mapping (adapt placeholders from search-queries.md):**

| Skill | Example command |
|-------|-----------------|
| `linkedin-search` | `bun run .agents/skills/linkedin-search/cli/src/cli.ts search -q "<title or skill>" -l "<city, region, country>" --jobage 14 --format json` |
| `jobindex-search` | `bun run .agents/skills/jobindex-search/cli/src/cli.ts search -q "<title> <city>" --format json` |
| `jobnet-search` | `bun run .agents/skills/jobnet-search/cli/src/cli.ts search -q "<title>" --format json` |
| `jobbank-search` | `bun run .agents/skills/jobbank-search/cli/src/cli.ts search -q "<title>" --format json` |
| `jobdanmark-search` | `bun run .agents/skills/jobdanmark-search/cli/src/cli.ts search -q "<title>" --format json` |
| Any `/add-portal` skill | Same pattern: `bun run .agents/skills/<name>/cli/src/cli.ts search ...` per its SKILL.md |

Run **parallel** Bash calls when multiple skills apply (e.g. LinkedIn + a local board).
Parse each JSON response: `results[]` with `id`, `title`, `company`, `location`, `date`, `url`.

If the user specified a focus area (e.g. "/scrape data science"), prioritize matching
queries and add 2–3 custom CLI searches for that focus.

**Fallback — WebSearch.** Use only when:
- No portal CLI covers a site listed in `search-queries.md` (e.g. company `site:` queries)
- A CLI command fails or returns zero results (note the failure, then try WebSearch for that query)

For WebSearch fallbacks:
- Use site-specific queries from `search-queries.md` (jobindex.dk, linkedin.com/jobs, etc.)
- Target your configured geographic area
- Prefer postings from the last 14 days

### Step 2: Fetch & Parse

**From CLI results:** Each search result already includes title, company, location,
date, and URL. For jobs worth a deeper look (high/medium fit candidates), fetch full
detail with the same skill's `detail` command (see its SKILL.md) to extract **key
requirements**, **application deadline**, and a brief description snippet.

**From WebSearch results:** Use `WebFetch` on the posting URL and extract the same
fields manually.

For every candidate:
- Skip if the URL or company+title combo already exists in `seen_jobs.json`
- Skip if the company+role already appears in `job_search_tracker.csv`

### Step 3: Quick Fit Assessment

For each new job, do a rapid fit check (NOT the full evaluation from `04-job-evaluation.md` - just a quick signal):

- **High match**: Role directly involves your core skills
- **Medium match**: Role is adjacent to your experience
- **Low match**: Role requires significant skills you lack

### Step 4: Deduplicate & Store

1. Add ALL fetched jobs (new and skipped) to `seen_jobs.json` with structure:
```json
{
  "seen": {
    "<url_or_company_title_key>": {
      "title": "...",
      "company": "...",
      "url": "...",
      "first_seen": "YYYY-MM-DD",
      "fit": "high/medium/low",
      "status": "new/skipped/evaluated/ranked/expired"
    }
  }
}
```
2. Only present jobs NOT already in the seen list or tracker.

### Step 5: Present Results

Present new jobs in a table sorted by fit (high first):

```
## New Job Matches - YYYY-MM-DD

Found X new positions (Y high, Z medium, W low match).

| # | Fit | Title | Company | Location | Deadline | URL |
|---|-----|-------|---------|----------|----------|-----|
| 1 | High | ... | ... | ... | ... | [Link](...) |

### High-Match Highlights
For each high-match job, add 2-3 bullet points:
- Why it matches your profile
- Key requirements to check
- Any red flags
```

After presenting, ask:
> "Want me to evaluate any of these in detail? Just give me the number(s)."

If the user picks a number, invoke the **job-application-assistant** skill workflow (fit evaluation first, then CV + cover letter if approved).

If the run found many new jobs (roughly 8+), also suggest `/rank` - it batch-scores all new postings against the full fit framework and returns a ranked shortlist, which beats eyeballing a long table. (`/rank` sets the `ranked` and `expired` status values in `seen_jobs.json`; treat both as already-seen for dedup purposes.)

### Step 6: Update Tracker (Optional)

If the user decides to apply to any job, add a row to `job_search_tracker.csv`.

---

## Important Rules

1. **Never fabricate job postings.** Only present jobs from actual CLI search/detail output or WebSearch/WebFetch results.
2. **Respect deduplication.** Always check seen_jobs.json AND job_search_tracker.csv before presenting.
3. **Focus on configured geographic area.** Skip jobs that require relocation or are clearly outside commute range.
4. **Only open positions.** Skip postings with expired deadlines or those marked as closed.
5. **Be efficient with detail fetches.** Don't run `detail` on every search hit — pre-filter by title/snippet, then detail only promising matches.
6. **Parallel searches.** Run portal CLI searches in parallel; use WebSearch only for gaps the CLIs don't cover.
