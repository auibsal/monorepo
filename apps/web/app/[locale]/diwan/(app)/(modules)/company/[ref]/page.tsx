import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProductionPage } from "@/components/nexus/admin/productions/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.productions.title")
);

/** A production on its own page, like its public page; new to propose one. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="productions">
      <ProductionPage productionRef={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
