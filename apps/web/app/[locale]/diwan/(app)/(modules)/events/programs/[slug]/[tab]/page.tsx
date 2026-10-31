import { notFound } from "next/navigation";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import {
  ProgramPage,
  type ProgramTab,
  programTabs,
} from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.title")
);

const isTab = (value: string): value is ProgramTab =>
  (programTabs as readonly string[]).includes(value);

/** One of a program's tabs, at its own address. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ slug: string; tab: string }>;
}) => {
  const { slug, tab } = await params;
  if (!isTab(tab) || tab === "sessions") {
    notFound();
  }
  return (
    <RequireModule module="programs">
      <ProgramPage slug={decodeURIComponent(slug)} tab={tab} />
    </RequireModule>
  );
};

export default Page;
