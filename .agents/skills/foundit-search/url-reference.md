# Foundit.in URL Reference

Public, unauthenticated `middleware` JSON endpoints used by this skill — the same
endpoints Foundit's own search page (`foundit.in/srp/results`) calls from the browser.

> Personal use only — keep volume low; don't use commercially or for bulk data collection.

Both endpoints require browser-like headers or they answer `400 "content negotiation failed"`:

```
User-Agent: <any modern browser UA>
Accept: application/json
Referer: https://www.foundit.in/srp/results
```

## Search

```
GET https://www.foundit.in/middleware/jobsearch
```

Query params:

| Param | Meaning | Example |
|-------|---------|---------|
| `query` | Free-text keywords | `python developer` |
| `locations` | City/region | `bangalore` · `mumbai` · `delhi` · `remote` |
| `jobFreshness` | Posted within N days | `1`, `3`, `7`, `15`, `30` |
| `experienceRanges` | Years of experience, `min~max` | `0~1`, `2~5`, `10~15` |
| `limit` | Page size (max 100) | `15` |
| `start` | Pagination offset | `0`, `15`, `30`, … |
| `queryDerived` | Always `true` (matches site behaviour) | `true` |

Returns JSON: `jobSearchResponse.data[]` is the job list;
`jobSearchResponse.meta.paging.total` is the total match count. Each entry carries
`id`, `title`, `companyName`, `locations`, `exp`, `salary`, `postedBy`/`updatedAt`,
`employmentTypes`, `skills`, and `seoJdUrl`/`jdUrl` (relative job-page path).

## Detail

```
GET https://www.foundit.in/middleware/jobdetail/<jobId>
```

Returns JSON: `jobDetailResponse` with the full HTML `description`, `skills[]`
(objects with `text`), `industries[]`, `functions[]`, `jobTypes[]`,
`employmentTypes[]`, `totalApplicants`, salary/experience min-max objects, and
`redirectUrl` (external apply link, when the posting is hosted off-site).
Top-level `activeJob` indicates whether the posting is still open.

## Notes

- No authentication or cookies required — just the three headers above.
- `salary` of `0-0 INR` (or `hideSalary: true`) means not disclosed — very common on Indian portals.
- Respect rate limits — the CLI backs off on 429/5xx.
- Naukri.com was evaluated first but its `jobapi` rejects non-browser traffic with `406 "recaptcha required"`, so Foundit is the scriptable choice for India.
