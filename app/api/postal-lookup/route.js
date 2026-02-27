export const dynamic = "force-dynamic";
export const revalidate = 0;

const timeoutFetch = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const postalCodeParam = searchParams.get("postal_code");
  const postalCode = String(postalCodeParam || "").replace(/\s+/g, "");

  if (!/^\d{4}$/.test(postalCode)) {
    return Response.json({ found: false, message: "Ugyldig postkode" }, { status: 400 });
  }

  try {
    const response = await timeoutFetch(`https://api.zippopotam.us/no/${encodeURIComponent(postalCode)}`);
    if (!response.ok) {
      return Response.json({
        found: false,
        message: "Fant ikke region fra postkode. Skriv inn region manuelt."
      });
    }

    const data = await response.json();
    const place = data?.places?.[0];
    const region = place?.["place name"] || "";
    if (!region) {
      return Response.json({
        found: false,
        message: "Fant ikke region fra postkode. Skriv inn region manuelt."
      });
    }

    return Response.json({
      found: true,
      region,
      county: place?.state || null
    });
  } catch {
    return Response.json({
      found: false,
      message: "Fant ikke region fra postkode. Skriv inn region manuelt."
    });
  }
}
