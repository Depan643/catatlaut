import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_ship_detail",
  title: "Detail kapal & hasil bongkar",
  description:
    "Get one ship record with all of its catch entries (jenis, berat) plus totals per species.",
  inputSchema: {
    kapal_id: z.string().uuid().describe("The ship record id returned by list_ships."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ kapal_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: ship, error: shipError } = await supabase
      .from("kapal_data")
      .select("*")
      .eq("id", kapal_id)
      .maybeSingle();
    if (shipError) return { content: [{ type: "text", text: shipError.message }], isError: true };
    if (!ship) return { content: [{ type: "text", text: "Kapal tidak ditemukan." }], isError: true };

    const { data: entries, error: entriesError } = await supabase
      .from("entries")
      .select("id, jenis, berat, waktu_input")
      .eq("kapal_id", kapal_id)
      .order("waktu_input", { ascending: true });
    if (entriesError) {
      return { content: [{ type: "text", text: entriesError.message }], isError: true };
    }

    const perSpecies: Record<string, number> = {};
    let total = 0;
    for (const e of entries ?? []) {
      perSpecies[e.jenis] = (perSpecies[e.jenis] ?? 0) + Number(e.berat);
      total += Number(e.berat);
    }
    const payload = {
      ship,
      entries: entries ?? [],
      totals: { per_species: perSpecies, total_kg: total },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
