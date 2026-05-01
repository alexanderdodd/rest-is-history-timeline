/**
 * Classify a single YouTube episode into temporal coverage + matching events
 * via Haiku 4.5 over OpenRouter (OpenAI-compatible endpoint).
 *
 * Bump CLASSIFIER_VERSION when the prompt or schema changes — the orchestrator
 * uses it to invalidate cached classifications.
 */

import OpenAI from "openai";
import { EVENTS } from "@/lib/data/events";
import type { ClassifiedEpisode, Confidence, CoverRange } from "./types";
import type { YouTubeVideo } from "./youtube";

export const CLASSIFIER_VERSION = "2026-05-01.v1";
export const CLASSIFIER_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `You categorise episodes of "The Rest Is History" podcast by the historical period(s) they discuss.

Given a YouTube episode title and description, output a JSON object:

{
  "covers": [{"startYear": <number>, "endYear": <number>}, ...],
  "eventIds": [<string>, ...],
  "confidence": "high" | "medium" | "low"
}

Rules:
- Years are integers. BC years are NEGATIVE (e.g. 44 BC = -44, 30 AD = 30).
- "covers" is one or more year ranges the episode is materially about. Use a single-year range like {startYear: 1789, endYear: 1799} for the French Revolution, or {startYear: 1914, endYear: 1918} for WWI. For an episode that bounces across centuries, use multiple ranges.
- "eventIds" lists ids from the provided event corpus that the episode is closely about. Only include events that are clearly central to the episode, not loose connections.
- "confidence":
  - "high" if the period is unambiguous from the title/description.
  - "medium" if the period is implied but not explicit, or you're choosing a date range for a thematic figure.
  - "low" if the episode has no clear historical period (e.g. interviews, methodology, the present).
- If the episode has no temporal anchor (book launches, hosts' chat, present-day commentary), return covers: [] and confidence: "low".
- Return ONLY the JSON object, no surrounding text or code fences.`;

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
};

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

  return {
    covers: covers
      .filter(
        (c): c is { startYear: number; endYear: number } =>
          typeof c === "object" &&
          c !== null &&
          typeof (c as Record<string, unknown>).startYear === "number" &&
          typeof (c as Record<string, unknown>).endYear === "number",
      )
      .map((c) => ({ startYear: c.startYear, endYear: c.endYear })),
    eventIds: eventIds.filter((id): id is string => typeof id === "string"),
    confidence,
  };
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
      "X-Title": "The Rest Is History — Timeline",
    },
  });
  return cachedClient;
}

export async function classifyVideo(video: YouTubeVideo): Promise<ClassifierOutput> {
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
      return parseClassifierOutput(text);
    } catch (err) {
      lastErr = err;
    }
  }
  // Both attempts failed — return a safe default so the rest of the run can proceed.
  console.warn(`Classifier failed for ${video.videoId}: ${String(lastErr)}`);
  return { covers: [], eventIds: [], confidence: "low" };
}

export function buildClassifiedEpisode(
  video: YouTubeVideo,
  output: ClassifierOutput,
): ClassifiedEpisode {
  return {
    youtubeId: video.videoId,
    title: video.title,
    description: video.description.slice(0, 500),
    publishedAt: video.publishedAt,
    durationSeconds: video.durationSeconds,
    thumbnailUrl: video.thumbnailUrl,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    covers: output.covers,
    eventIds: output.eventIds,
    confidence: output.confidence,
    classifierVersion: CLASSIFIER_VERSION,
    classifiedAt: new Date().toISOString(),
  };
}
