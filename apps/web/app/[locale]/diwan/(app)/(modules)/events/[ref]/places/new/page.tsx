import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewProgramOpening } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.callboard.new")
);

/** A program's new opening, on its own page under Places. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="programs">
      <NewProgramOpening slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
