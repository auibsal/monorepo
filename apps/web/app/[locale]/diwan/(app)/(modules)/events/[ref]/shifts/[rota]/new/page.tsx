import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewProgramShift } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.rotas.addShift")
);

/** A new shift on one of a program's rotas, on its own page under Shifts. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ ref: string; rota: string }>;
}) => {
  const { ref, rota } = await params;
  return (
    <RequireModule module="programs">
      <NewProgramShift rotaId={rota} slug={decodeURIComponent(ref)} />
    </RequireModule>
  );
};

export default Page;
