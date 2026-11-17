import { createAdminClient } from "@repo/database/admin";
import { isDataset, readDataset, toCsv } from "@/lib/api/open-data";

const CC0 = "https://creativecommons.org/publicdomain/zero/1.0/";

/**
 * GET /api/open-data/<dataset>.json or .csv — a public dataset, dedicated
 * to the public domain (CC0, in the Link header).
 */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ dataset: string }> }
) => {
  const { dataset: file } = await params;
  const [name = "", format = "json"] = file.split(".");
  if (!(isDataset(name) && (format === "json" || format === "csv"))) {
    return new Response("Not found", { status: 404 });
  }
  const rows = await readDataset(createAdminClient(), name);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
    "Content-Disposition": `inline; filename="${name}.${format}"`,
    Link: `<${CC0}>; rel="license"`,
  };
  return format === "csv"
    ? new Response(toCsv(rows), {
        headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
      })
    : Response.json(rows, { headers });
};
