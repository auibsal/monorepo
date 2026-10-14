"use client";

import { useQueryParam } from "@/lib/use-query-param";
import { isNamedDesk, SendToDesk } from "./desk";
import { SubmitWork } from "./pages";

/** /journal/submit?desk=news|video|voices, or an Edition call. */
export const SubmitByDesk = () => {
  const desk = useQueryParam("desk");
  return isNamedDesk(desk) ? <SendToDesk desk={desk} /> : <SubmitWork />;
};
