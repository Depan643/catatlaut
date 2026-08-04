import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_ships",
  title: "Daftar kapal",
  description:
    "List ship unloading records (kapal) for the signed-in user, newest first. Optionally filter by month, year, or PIPP status.",
  inputSchema: {
    year: z.number().int().min(2000).max(2100).optional().describe("Filter by year of tanggal."),
    month: z.number().int().min(1).max(12).optional().describe("Filter by month (1-12) of tanggal."),
    done_pipp: z.boolean().optional().describe("Filter by PIPP completion status."),
    limit: z.number().int().min(1).max(200).default(50).describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ year, month, done_pipp, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("kapal_data")
      .select(
        "id, nama_kapal, tanggal, jenis_pendataan, alat_tangkap, posisi_dermaga, tanda_selar_gt, tanda_selar_no, tanda_selar_huruf, done_pipp, notes",
      )
      .order("tanggal", { ascending: false })
      .limit(limit ?? 50);

    if (typeof done_pipp === "boolean") query = query.eq("done_pipp", done_pipp);
    if (year) {
      const m = month ?? 1;
      const start = month ? `${year}-${String(m).padStart(2, "0")}-01` : `${year}-01-01`;
      const endDate = month ? new Date(Date.UTC(year, m, 1)) : new Date(Date.UTC(year + 1, 0, 1));
      query = query.gte("tanggal", start).lt("tanggal", endDate.toISOString().slice(0, 10));
    }

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { ships: data ?? [] },
    };
  },
});
