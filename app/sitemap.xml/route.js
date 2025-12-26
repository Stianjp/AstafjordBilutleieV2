const staticRoutes = [
  "",
  "/login",
  "/admin",
  "/admin/cars",
  "/admin/locations",
  "/admin/mileage"
];

export function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astafjordbilutleie.no";
  const urls = staticRoutes
    .map((path) => {
      return `  <url>\n    <loc>${siteUrl}${path}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml"
    }
  });
}
