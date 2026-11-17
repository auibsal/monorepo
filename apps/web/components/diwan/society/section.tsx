import type { ReactNode } from "react";
import { DiwanSection } from "../page";

/** A Society page section: the Diwan's section head. */
export const SocietySection = ({
  children,
  id,
  title,
}: {
  readonly children: ReactNode;
  readonly id: string;
  readonly title: string;
}) => (
  <DiwanSection id={id} title={title}>
    {children}
  </DiwanSection>
);
