import { getContractContent } from "../../../lib/contractSettingsServer";
import { resolveContractLanguage } from "../../../lib/contractSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const language = resolveContractLanguage(searchParams.get("lang"));
  const contract = await getContractContent(language);

  return Response.json(
    { language, contract },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
