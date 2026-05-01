import EpisodeCard from "@/components/EpisodeCard";
import SearchBar from "@/components/SearchBar";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import { formatYearLabel } from "@/lib/dates";
import { loadEpisodesForTimeline } from "@/lib/episodes-loader";

// Re-render at most once an hour. The cron route also calls revalidatePath("/")
// after a sync, so fresh episodes appear without waiting for the timer.
export const revalidate = 3600;

export default async function Home() {
  const episodes = await loadEpisodesForTimeline();
  const items: TimelineItem[] = episodes.map((ep) => ({
    id: ep.youtubeId,
    dateLabel: formatYearLabel(ep.timelineYear),
    content: <EpisodeCard episode={ep} />,
  }));

  return (
    <main className="page">
      <SearchBar episodes={episodes} />
      <Timeline items={items} />
    </main>
  );
}
