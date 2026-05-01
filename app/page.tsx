import SearchBar from "@/components/SearchBar";
import Timeline from "@/components/Timeline";
import { loadEventsWithEpisodes } from "@/lib/episodes-loader";

// Re-render at most once an hour. The cron route also calls revalidatePath("/")
// after a sync, so fresh episodes appear without waiting for the timer.
export const revalidate = 3600;

export default async function Home() {
  const events = await loadEventsWithEpisodes();
  return (
    <main className="page">
      <SearchBar events={events} />
      <Timeline events={events} />
    </main>
  );
}
