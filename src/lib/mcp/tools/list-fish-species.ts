import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_fish_species",
  title: "Daftar jenis ikan",
  description: "List the active fish/squid species catalog (nama ikan, nama latin, kategori, harga).",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Filter by name (case-insensitive)."),
    kategori: z.string().trim().min(1).optional().describe("Filter by kategori."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, kategori }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("fish_species")
      .select("id, nama_ikan, nama_latin, kategori, harga, is_active")
      .eq("is_active", true)
      .order("urutan", { ascending: true });
    if (search) query = query.ilike("nama_ikan", `%${search}%`);
    if (kategori) query = query.eq("kategori", kategori);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { species: data ?? [] },
    };
  },
});
