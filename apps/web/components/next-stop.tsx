import type { Locale } from "@repo/internationalization";
import { journal } from "@repo/sal-data";
import { readPublished } from "@/lib/supabase";

/** Next Stop's published episodes in this language, newest first. */
export const loadEpisodes = async (locale: Locale) =>
  journal.inLanguage(
    await readPublished(
      ["journal"],
      (c) =>
        journal.deskPieces(c, "video", {
          categories: ["next_stop_episode"],
          limit: 48,
        }),
      []
    ),
    locale
  );
