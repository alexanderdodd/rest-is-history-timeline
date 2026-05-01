import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Single-page app — the sitemap is one entry. The cron sync revalidates the
 * page monthly, so a monthly changeFrequency hint matches reality.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
