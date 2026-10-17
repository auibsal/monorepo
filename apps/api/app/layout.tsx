import "./styles.css";
import { project } from "@repo/config";
import { fonts } from "@repo/design-system/lib/fonts";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Site } from "@/components/site";

interface RootLayoutProperties {
  readonly children: ReactNode;
}

export const metadata: Metadata = {
  description:
    "Sign in with SAL, the Waraq API and the Society's calendar feeds: how apps work with the AUIB Society of Arts and Letters.",
  metadataBase: new URL(project.hosts.api),
  title: {
    default: `${project.shortName} API`,
    template: `%s · ${project.shortName} API`,
  },
};

// Route handlers (the API itself) never render this; only the pages about it.
const RootLayout = ({ children }: RootLayoutProperties) => (
  <html className={fonts} dir="ltr" lang="en">
    <body className="bg-surface text-text">
      <Site>{children}</Site>
    </body>
  </html>
);

export default RootLayout;
