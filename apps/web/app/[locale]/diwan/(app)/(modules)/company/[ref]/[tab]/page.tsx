import { notFound } from "next/navigation";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProductionPage } from "@/components/nexus/admin/productions/admin";
import {
  type ProductionTab,
  productionTabs,
} from "@/components/nexus/admin/tabs";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.productions.title")
);

const isTab = (value: string): value is ProductionTab =>
  (productionTabs as readonly string[]).includes(value);

/** One part of a production (rights, auditions, credits ...), its own page. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string; tab: string }>;
}) => {
  const { ref, tab } = await params;
  if (!isTab(tab) || tab === "details") {
    notFound();
  }
  return (
    <RequireModule module="productions">
      <ProductionPage productionRef={decodeURIComponent(ref)} tab={tab} />
    </RequireModule>
  );
};

export default Page;
