import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewProgramRota } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.rotas.new")
);

/** A program's new rota, on its own page under Shifts. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="programs">
      <NewProgramRota slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
