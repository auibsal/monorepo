import { notFound } from "next/navigation";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewProductionRecord } from "@/components/nexus/admin/productions/admin";
import {
  type ProductionNewTab,
  productionNewTabs,
} from "@/components/nexus/admin/tabs";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.productions.title")
);

const takesNew = (value: string): value is ProductionNewTab =>
  (productionNewTabs as readonly string[]).includes(value);

/** A production's new audition slot, credit or rehearsal, its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string; tab: string }>;
}) => {
  const { ref, tab } = await params;
  if (!takesNew(tab)) {
    notFound();
  }
  return (
    <RequireModule module="productions">
      <NewProductionRecord productionRef={decodeURIComponent(ref)} tab={tab} />
    </RequireModule>
  );
};

export default Page;
