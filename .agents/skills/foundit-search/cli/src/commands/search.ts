import {
  SEARCH_URL,
  jsonFetch,
  toJobCard,
  experienceRange,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage?: number
  experience?: string
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("query", opts.query)
  if (opts.location) params.set("locations", opts.location)
  if (opts.jobage && opts.jobage > 0 && opts.jobage < 9999) {
    params.set("jobFreshness", String(opts.jobage))
  }
  const exp = experienceRange(opts.experience)
  if (exp) params.set("experienceRanges", exp)
  params.set("limit", String(opts.limit))
  params.set("start", String((opts.page - 1) * opts.limit))
  params.set("queryDerived", "true")
  return `${SEARCH_URL}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 42).padEnd(42)
    const company = (c.company || "—").slice(0, 26).padEnd(26)
    const loc = (c.location || "—").slice(0, 24).padEnd(24)
    const exp = (c.experience || "—").slice(0, 10).padEnd(10)
    const posted = c.posted || "—"
    return `${c.id.padEnd(9)} ${title} ${company} ${loc} ${exp} ${posted}`
  })
  const header =
    "ID".padEnd(9) +
    " " +
    "TITLE".padEnd(42) +
    " " +
    "COMPANY".padEnd(26) +
    " " +
    "LOCATION".padEnd(24) +
    " " +
    "EXP".padEnd(10) +
    " POSTED"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const data = (await jsonFetch(buildUrl(opts))) as {
      jobSearchResponse?: {
        data?: unknown[]
        meta?: { paging?: { total?: number } }
      }
    } | null
    const response = data?.jobSearchResponse
    if (!response || !Array.isArray(response.data)) {
      writeError("Unexpected response from Foundit search API", "BAD_RESPONSE")
      return 1
    }
    // The results array interleaves "adsense" ad slots with real job cards.
    const cards = response.data
      .filter((j) => (j as Record<string, unknown>)?.id || (j as Record<string, unknown>)?.jobId)
      .map((j) => toJobCard(j as Record<string, unknown>))
    const total = response.meta?.paging?.total ?? cards.length

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.experience || "—"} · ${c.posted || "—"}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: cards.length, total, page: opts.page }, results: cards },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
