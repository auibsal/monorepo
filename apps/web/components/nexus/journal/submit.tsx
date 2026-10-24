"use client";

import { journal } from "@repo/sal-data";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { isNamedDesk, SendToDesk } from "./desk";
import { SubmitWork } from "./pages";

const isCategory = (value: string | null): value is journal.Category =>
  (journal.categories as readonly string[]).includes(value ?? "");

/**
 * /qirtas/submit?type=<type>: the type decides the process. News, Video and
 * Voices types go to their desk; Letters and Gallery types answer an
 * Edition's call and are read blind. (?desk= and ?call= still work.)
 */
export const SubmitByDesk = () => {
  const type = useQueryParam("type");
  const deskParam = useQueryParam("desk");
  const desk = isCategory(type) ? journal.deskOf(type) : deskParam;
  return isNamedDesk(desk) ? (
    <SendToDesk desk={desk} initial={isCategory(type) ? type : undefined} />
  ) : (
    <SubmitWork />
  );
};
