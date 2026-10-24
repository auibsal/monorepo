import type { ReactNode } from "react";
import { DiwanSection } from "../page";

interface SectionProps {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly id: string;
  readonly title: string;
}

/** A home section: the Diwan's section head, then its content. */
export const Section = (props: SectionProps) => <DiwanSection {...props} />;
