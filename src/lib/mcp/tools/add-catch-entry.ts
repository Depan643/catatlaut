import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "add_catch_entry",
  title: "Tambah data hasil bongkar",
  description:
    "Add a catch entry (jenis + berat in kg) to an existing ship unloading record owned by the signed-in user.",
  inputSchema: {
    kapal_id: z.string().uuid().describe("Target ship record id."),
    jenis: z.string().trim().min(1).describe("Species name, e.g. 'Peperek'."),
    berat: z.number().positive().describe("Weight in kilograms."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ kapal_id, jenis, berat }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    if (!userId) {
      return { content: [{ type: "text", text: "Missing user identity in token" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("entries")
      .insert({ kapal_id, jenis, berat, user_id: userId })
      .select("id, kapal_id, jenis, berat, waktu_input")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { entry: data },
    };
  },
});
