export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astafjordbilutleie.no";
  const body = `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain"
    }
  });
}
