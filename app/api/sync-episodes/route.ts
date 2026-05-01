import { revalidatePath } from "next/cache";
import { syncEpisodes } from "@/lib/sync/run";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Vercel cron entrypoint. Runs the sync orchestrator on the monthly schedule
 * defined in vercel.json. The expectation is that the initial backfill has
 * already happened locally — this handler should only need to classify the
 * handful of episodes published since the previous monthly run (typically
 * 4-12). At 4-way concurrency this fits comfortably inside Pro's 300s cap.
 *
 * Vercel passes a Bearer token equal to CRON_SECRET on cron-triggered calls;
 * we reject anything else so the route can't be invoked publicly.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await syncEpisodes({
      log: (ev) => console.log(JSON.stringify(ev)),
    });

    // Refresh the cached page so the new episodes show up without a deploy.
    revalidatePath("/");

    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    return Response.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
