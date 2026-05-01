import EventCard from "@/components/EventCard";
import SearchBar from "@/components/SearchBar";
import Timeline, { type TimelineItem } from "@/components/Timeline";
import { formatEventDate } from "@/lib/dates";
import { loadEventsWithEpisodes } from "@/lib/episodes-loader";

// Re-render at most once an hour. The cron route also calls revalidatePath("/")
// after a sync, so fresh episodes appear without waiting for the timer.
export const revalidate = 3600;

export default async function Home() {
  const events = await loadEventsWithEpisodes();
  const items: TimelineItem[] = events.map((event) => ({
    id: event.id,
    dateLabel: formatEventDate(event.year, event.month, event.day),
    content: <EventCard event={event} />,
  }));

  return (
    <main className="page">
      <SearchBar events={events} />
      <Timeline items={items} />
    </main>
  );
}
