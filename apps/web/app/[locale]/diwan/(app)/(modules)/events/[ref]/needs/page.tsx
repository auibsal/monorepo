import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { ProgramPage } from "@/components/diwan/admin/programmes/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.programmes.title")
);

/** A program's needs, at their own address. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="programs">
      <ProgramPage slug={decodeURIComponent(ref)} tab="needs" />
    </RequireModule>
  );
};

export default Page;
