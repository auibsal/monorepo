import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProgramPage } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.title")
);

const Page = async ({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  return (
    <RequireModule module="programs">
      <ProgramPage slug={decodeURIComponent(slug)} />
    </RequireModule>
  );
};

export default Page;
