import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProgramPage } from "@/components/nexus/admin/programmes/admin";
import { SectionSpinner } from "@/components/nexus/states";
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
      <Suspense fallback={<SectionSpinner />}>
        <ProgramPage slug={decodeURIComponent(slug)} />
      </Suspense>
    </RequireModule>
  );
};

export default Page;
