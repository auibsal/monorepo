"use client";

import { journal } from "@repo/sal-data";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { isNamedDesk, SendToDesk } from "./desk";
import { JournalHome, SubmitWork } from "./pages";

const isCategory = (value: string | null): value is journal.Category =>
  (journal.categories as readonly string[]).includes(value ?? "");

/**
 * The form for one type: the type decides the process. News, Video and
 * Voices types go to their desk; Letters and Gallery types answer an
 * Edition's call and are read blind. (?desk= and ?call= work too.)
 */
const SubmitByDesk = () => {
  const type = useQueryParam("type");
  const deskParam = useQueryParam("desk");
  const desk = isCategory(type) ? journal.deskOf(type) : deskParam;
  return isNamedDesk(desk) ? (
    <SendToDesk desk={desk} initial={isCategory(type) ? type : undefined} />
  ) : (
    <SubmitWork />
  );
};

/**
 * /qirtas/write: one page for writing for Qirtas. Without a type it shows
 * the two doors and the member's work; with one (?type=, ?desk= or ?call=)
 * it is the form for it.
 */
export const QirtasWrite = () => {
  const type = useQueryParam("type");
  const desk = useQueryParam("desk");
  const call = useQueryParam("call");
  return type || desk || call ? <SubmitByDesk /> : <JournalHome />;
};
