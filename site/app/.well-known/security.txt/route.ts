import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

export function GET() {
  const body = [
    `Contact: mailto:${siteConfig.securityContact}`,
    `Preferred-Languages: en`,
    `Canonical: ${siteConfig.url}${siteConfig.securityPath}`,
    `Policy: ${siteConfig.repoUrl}/security/policy`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
