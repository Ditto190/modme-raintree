import type { MetadataRoute } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(siteConfig.lastModified),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl(siteConfig.comparePath),
      lastModified: new Date(siteConfig.lastModified),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    {
      url: absoluteUrl(siteConfig.launchPath),
      lastModified: new Date(siteConfig.lastModified),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
