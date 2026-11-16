import type { Tables } from "@repo/database/types";

export type ProductionRow = Tables<{ schema: "programs" }, "productions">;

export const productionsKey = ["admin", "productions"];

export const productionKey = (id: string) => [...productionsKey, id];
