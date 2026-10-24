import type { ReactNode } from "react";
import { DiwanSection } from "../page";

/** A Society page section: the Diwan's section head and its line. */
export const SocietySection = ({
  children,
  id,
  lede,
  title,
}: {
  readonly children: ReactNode;
  readonly id: string;
  readonly lede?: string;
  readonly title: string;
}) => (
  <DiwanSection description={lede} id={id} title={title}>
    {children}
  </DiwanSection>
);
