import { localizedPath } from "@repo/internationalization";
import { permanentRedirect } from "next/navigation";
import type { LocaleParams } from "@/lib/page";

// Moved under Programs (2026-10-16); old links still arrive.
const MovedPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  permanentRedirect(localizedPath(locale, "/programs/productions"));
};

export default MovedPage;
