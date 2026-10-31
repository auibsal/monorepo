import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProgramPage } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.title")
);

/** A program's places (its openings), at their own address. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="programs">
      <ProgramPage slug={decodeURIComponent(ref)} tab="places" />
    </RequireModule>
  );
};

export default Page;
