// Data source: Foundit.in (formerly Monster India) public "middleware" JSON API.
// No authentication required; the endpoints just expect a browser-like User-Agent,
// an Accept: application/json header, and a foundit.in Referer (without the
// Referer the API answers 400 "content negotiation failed").

export const SEARCH_URL = "https://www.foundit.in/middleware/jobsearch"
export const DETAIL_URL = "https://www.foundit.in/middleware/jobdetail"
export const SITE_URL = "https://www.foundit.in"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `${SITE_URL}/srp/results`,
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  experience: string | null
  salary: string | null
  posted: string | null
  employmentTypes: string[]
  url: string
}

export interface JobDetail extends JobCard {
  jobTypes: string[]
  industries: string[]
  functions: string[]
  skills: string[]
  totalApplicants: number | null
  description: string | null
  applyUrl: string | null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&nbsp;/g, " ")
}

/** Convert the job description's HTML to plain text, keeping paragraph breaks. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = Record<string, any>

/** "0-0 INR" and hideSalary both mean the salary is not disclosed. */
function readSalary(job: Raw): string | null {
  if (job.hideSalary) return null
  const salary = typeof job.salary === "string" ? job.salary.trim() : ""
  if (!salary || salary.startsWith("0-0")) return null
  return salary
}

function readExperience(job: Raw): string | null {
  if (typeof job.exp === "string" && job.exp.trim()) return job.exp.trim()
  const min = job.minimumExperience?.years
  const max = job.maximumExperience?.years
  if (min == null && max == null) return null
  if (min != null && max != null) return `${min}-${max} Years`
  return `${min ?? max}+ Years`
}

function readLocation(job: Raw): string | null {
  if (typeof job.locations === "string" && job.locations.trim()) return job.locations.trim()
  if (Array.isArray(job.locations)) {
    const cities = job.locations
      .map((l: Raw) => (typeof l === "string" ? l : l?.city))
      .filter(Boolean)
    if (cities.length > 0) return cities.join("; ")
  }
  return null
}

function readUrl(job: Raw): string {
  const path = job.seoJdUrl || job.jdUrl
  if (typeof path === "string" && path.startsWith("/")) return `${SITE_URL}${path}`
  return `${SITE_URL}/job/${job.id ?? job.jobId ?? ""}`
}

/** Map one raw search-result entry to a JobCard. */
export function toJobCard(job: Raw): JobCard {
  return {
    id: String(job.id ?? job.jobId ?? ""),
    title: typeof job.title === "string" ? job.title.trim() : "(untitled)",
    company: job.hideCompanyName ? null : job.companyName || null,
    location: readLocation(job),
    experience: readExperience(job),
    salary: readSalary(job),
    posted: job.postedBy || job.updatedAt || null,
    employmentTypes: Array.isArray(job.employmentTypes) ? job.employmentTypes.filter(Boolean) : [],
    url: readUrl(job),
  }
}

function readSkillList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((s: Raw) => (typeof s === "string" ? s : s?.text)).filter(Boolean)
  }
  if (typeof value === "string") {
    return value.split(",").map((s) => s.trim()).filter(Boolean)
  }
  return []
}

/** Map the raw jobDetailResponse to a JobDetail. */
export function toJobDetail(job: Raw): JobDetail {
  const card = toJobCard(job)
  // The full skill list is split across `skills` and `itSkills`; merge and dedupe.
  const skills = [...new Set([...readSkillList(job.skills), ...readSkillList(job.itSkills)])]
  return {
    ...card,
    posted: job.postedAt || card.posted,
    jobTypes: Array.isArray(job.jobTypes) ? job.jobTypes.filter(Boolean) : [],
    industries: Array.isArray(job.industries) ? job.industries.filter(Boolean) : [],
    functions: Array.isArray(job.functions) ? job.functions.filter(Boolean) : [],
    skills,
    totalApplicants: typeof job.totalApplicants === "number" ? job.totalApplicants : null,
    description: typeof job.description === "string" ? htmlToText(job.description) || null : null,
    applyUrl: job.redirectUrl || null,
  }
}

/**
 * Parse an --experience value into Foundit's experienceRanges format ("min~max").
 * Accepts "2-5", "2~5", or a single number like "3" (treated as 3~3).
 */
export function experienceRange(input: string | undefined): string | null {
  if (!input) return null
  const m = input.match(/^(\d{1,2})\s*[-~]\s*(\d{1,2})$/)
  if (m) return `${m[1]}~${m[2]}`
  const single = input.match(/^(\d{1,2})$/)
  if (single) return `${single[1]}~${single[1]}`
  return null
}
