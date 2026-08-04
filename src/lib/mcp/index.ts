import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listShipsTool from "./tools/list-ships";
import getShipDetailTool from "./tools/get-ship-detail";
import listFishSpeciesTool from "./tools/list-fish-species";
import addCatchEntryTool from "./tools/add-catch-entry";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "catat-laut",
  title: "Catat Laut",
  version: "0.1.0",
  instructions:
    "Tools for Catat Laut, the PPN Tegalsari ship unloading data system. Use `list_ships` to find ship unloading records, `get_ship_detail` for a ship's catch entries and totals, `list_fish_species` for the species catalog, and `add_catch_entry` to record a new catch weight. All data is scoped to the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listShipsTool, getShipDetailTool, listFishSpeciesTool, addCatchEntryTool],
});
