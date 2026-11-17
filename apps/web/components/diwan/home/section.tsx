import type { ReactNode } from "react";
import { DiwanSection } from "../page";

interface SectionProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly id: string;
  /** Data only, such as "5 of 9 done". */
  readonly meta?: ReactNode;
  readonly title: string;
}

/** A home section: the Diwan's section head, then its content. */
export const Section = (props: SectionProps) => <DiwanSection {...props} />;
