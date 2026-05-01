/**
 * Classify a single YouTube episode into temporal coverage + matching events
 * via Haiku 4.5 over OpenRouter (OpenAI-compatible endpoint).
 *
 * Bump CLASSIFIER_VERSION when the prompt or schema changes — the orchestrator
 * uses it to invalidate cached classifications.
 */

import OpenAI from "openai";
import { EVENTS } from "@/lib/data/events";
import type {
  ClassifiedEpisode,
  Confidence,
  CoverRange,
  SeriesInfo,
} from "./types";
import type { YouTubeVideo } from "./youtube";

export const CLASSIFIER_VERSION = "2026-05-01.v4";
export const CLASSIFIER_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `You categorise episodes of "The Rest Is History" podcast by the historical period(s) they discuss and identify multi-part series membership.

Given a YouTube episode title and description, output a JSON object:

{
  "covers": [{"startYear": <number>, "endYear": <number>, "startMonth"?: <1-12>, "startDay"?: <1-31>, "endMonth"?: <1-12>, "endDay"?: <1-31>}, ...],
  "eventIds": [<string>, ...],
  "confidence": "high" | "medium" | "low",
  "series": { "name": <string>, "partNumber": <number>, "totalParts"?: <number> } | null
}

COVERS — temporal scope of THIS episode:
- Years are integers. BC years are NEGATIVE (e.g. 44 BC = -44, 30 AD = 30).
- For a single-topic episode, use a tight range. For an episode that bounces across centuries, use multiple ranges.
- "startMonth"/"startDay"/"endMonth"/"endDay" are OPTIONAL and 1-indexed. Include them when the episode is about a SPECIFIC dated event (e.g. "Storming of the Bastille" → 1789-07-14; "Assassination of Caesar" → -44-03-15). Omit them for broad topical coverage where a specific date is meaningless.

ANCHOR THE START YEAR TO THE EPISODE'S NARRATIVE — NOT THE BROADER TOPIC:
- For multi-part series, "covers.startYear" should reflect where THIS PART's narrative actually begins, not the whole series' topic.
- Background context references don't count. Example: an episode titled "Why Marie Antoinette became hated (Part 1)" should anchor at her arrival in France (1770) or accession as Queen (1774) — NOT her birth in 1755 even if her childhood is mentioned in passing. The episode's main narrative is the events that LED to her being hated, not her cradle.
- Within a series, Part 1's startYear is usually earlier than later parts'. Don't over-extend Part 1's range backwards into pure backstory.

EVENT IDS:
- "eventIds" lists ids from the provided event corpus the episode is closely about. Only include events clearly central, not loose connections.

CONFIDENCE:
- "high" if the period is unambiguous from the title/description.
- "medium" if the period is implied but not explicit, or you're choosing a date range for a thematic figure.
- "low" if the episode has no clear historical period.
- For episodes with no temporal anchor (book launches, hosts' chat, present-day commentary), return covers: [] and confidence: "low".

SERIES DETECTION:
- Look for "Part 2", "Episode 3", "S02E01", "(Part 4)", "| Part N |", "Season X Episode Y", or similar patterns in the title. If the title clearly identifies the episode as part of a multi-part series, set "series".
- ALWAYS INCLUDE THE SEASON IN THE SERIES NAME when one is present in the title. "The French Revolution S02E03" → name: "The French Revolution Season 2". "The French Revolution S03E02" → name: "The French Revolution Season 3". A different season is a DIFFERENT SERIES — they should not share a name.
- For series with only "Part N" (no season), the canonical name is the topic without ordinal markers (e.g. "The French Revolution"). Be consistent across parts — always include or always omit "The". Prefer "The French Revolution" (with "The") if the title uses that form.
- Strip "Part N", "Episode N", "SXXEXX", "| Part X |" from the name itself.
- "partNumber" is 1-indexed within the named series. For "S02E03", partNumber is 3 (the episode within season 2).
- "totalParts" is the total in the series if you can infer it from "of N" or context; otherwise omit.
- If the episode is a one-off (not part of a series), set "series" to null.

Return ONLY the JSON object, no surrounding text or code fences.`;

function eventCorpusBlock(): string {
  return EVENTS.map((e) => `${e.id} (${formatYear(e.year)}): ${e.title}`).join("\n");
}

function formatYear(year: number): string {
  if (year < 0) return `${-year} BC`;
  if (year < 1000) return `AD ${year}`;
  return String(year);
}

function userPrompt(video: YouTubeVideo): string {
  const desc = video.description.slice(0, 1500);
  return `Event corpus (id, year, title):
${eventCorpusBlock()}

Episode title: ${video.title}

Episode description:
${desc}

Output the JSON object now.`;
}

type ClassifierOutput = {
  covers: CoverRange[];
  eventIds: string[];
  confidence: Confidence;
  series?: SeriesInfo;
};

function pickDatePart(
  raw: unknown,
  min: number,
  max: number,
): number | undefined {
  if (typeof raw !== "number") return undefined;
  const n = Math.round(raw);
  if (n < min || n > max) return undefined;
  return n;
}

function parseSeries(raw: unknown): SeriesInfo | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string" || typeof r.partNumber !== "number") return undefined;
  const name = r.name.trim();
  if (!name) return undefined;
  const out: SeriesInfo = {
    name,
    partNumber: Math.max(1, Math.round(r.partNumber)),
  };
  if (typeof r.totalParts === "number" && r.totalParts > 0) {
    out.totalParts = Math.round(r.totalParts);
  }
  return out;
}

function parseClassifierOutput(text: string): ClassifierOutput {
  // Tolerate stray code fences or surrounding text.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in response");
  const json = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;

  const covers = Array.isArray(json.covers) ? json.covers : [];
  const eventIds = Array.isArray(json.eventIds) ? json.eventIds : [];
  const confidence =
    json.confidence === "high" || json.confidence === "medium" || json.confidence === "low"
      ? json.confidence
      : "low";

  const out: ClassifierOutput = {
    covers: covers
      .filter(
        (c): c is Record<string, unknown> =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Record<string, unknown>).startYear === "number" &&
          typeof (c as Record<string, unknown>).endYear === "number",
      )
      .map((c) => {
        const range: CoverRange = {
          startYear: c.startYear as number,
          endYear: c.endYear as number,
        };
        const sm = pickDatePart(c.startMonth, 1, 12);
        if (sm !== undefined) range.startMonth = sm;
        const sd = pickDatePart(c.startDay, 1, 31);
        if (sd !== undefined) range.startDay = sd;
        const em = pickDatePart(c.endMonth, 1, 12);
        if (em !== undefined) range.endMonth = em;
        const ed = pickDatePart(c.endDay, 1, 31);
        if (ed !== undefined) range.endDay = ed;
        return range;
      }),
    eventIds: eventIds.filter((id): id is string => typeof id === "string"),
    confidence,
  };

  const series = parseSeries(json.series);
  if (series) out.series = series;
  return out;
}

let cachedClient: OpenAI | undefined;

function client(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  cachedClient = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/alexanderdodd/rest-is-history-timeline",
      // ASCII-only — HTTP headers are ByteStrings. An em dash here makes
      // undici reject every request before it leaves the box.
      "X-Title": "The Rest Is History Timeline",
    },
  });
  return cachedClient;
}

export type ClassifyResult = {
  output: ClassifierOutput;
  /** True when both attempts threw and we returned the safe default. */
  fallback: boolean;
};

export async function classifyVideo(video: YouTubeVideo): Promise<ClassifyResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client().chat.completions.create({
        model: CLASSIFIER_MODEL,
        temperature: 0,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(video) },
        ],
      });
      const text = completion.choices[0]?.message?.content ?? "";
      return { output: parseClassifierOutput(text), fallback: false };
    } catch (err) {
      lastErr = err;
    }
  }
  console.warn(`Classifier failed for ${video.videoId}: ${String(lastErr)}`);
  return {
    output: { covers: [], eventIds: [], confidence: "low" },
    fallback: true,
  };
}

export function buildClassifiedEpisode(
  video: YouTubeVideo,
  result: ClassifyResult,
): ClassifiedEpisode {
  return {
    youtubeId: video.videoId,
    title: video.title,
    description: video.description.slice(0, 500),
    publishedAt: video.publishedAt,
    durationSeconds: video.durationSeconds,
    thumbnailUrl: video.thumbnailUrl,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    covers: result.output.covers,
    eventIds: result.output.eventIds,
    confidence: result.output.confidence,
    classifierVersion: CLASSIFIER_VERSION,
    classifiedAt: new Date().toISOString(),
    ...(result.output.series ? { series: result.output.series } : {}),
    ...(result.fallback ? { classifierFallback: true } : {}),
  };
}
