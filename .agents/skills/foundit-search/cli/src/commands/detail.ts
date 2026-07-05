import { DETAIL_URL, jsonFetch, toJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a raw job ID or a foundit.in job URL (trailing numeric segment). */
function normalizeId(input: string): string | null {
  const bare = input.match(/^\d{4,}$/)
  if (bare) return input
  const url = input.match(/-(\d{4,})(?:\?|\/|$)/) || input.match(/\/(\d{4,})(?:\?|$)/)
  if (url) return url[1]
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const data = (await jsonFetch(`${DETAIL_URL}/${id}`)) as {
      jobDetailResponse?: Record<string, unknown>
      activeJob?: boolean
    } | null
    // Unknown IDs come back as HTTP 200 with an empty jobDetailResponse.
    const raw = data?.jobDetailResponse
    if (!raw || (!raw.id && !raw.jobId)) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = toJobDetail(raw)

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.experience ? `Experience: ${job.experience}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        job.employmentTypes.length ? `Employment: ${job.employmentTypes.join(", ")}` : "",
        job.jobTypes.length ? `Job type: ${job.jobTypes.join(", ")}` : "",
        job.functions.length ? `Function: ${job.functions.join(", ")}` : "",
        job.industries.length ? `Industries: ${job.industries.join(", ")}` : "",
        job.skills.length ? `Skills: ${job.skills.join(", ")}` : "",
        job.totalApplicants != null ? `Applicants: ${job.totalApplicants}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
        job.applyUrl ? `Apply: ${job.applyUrl}` : "",
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
