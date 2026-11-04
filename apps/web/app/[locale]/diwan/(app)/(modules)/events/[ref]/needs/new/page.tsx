import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewProgramNeed } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.needs.new"));

/** A program's new need, on its own page under Needs. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="programs">
      <NewProgramNeed slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
