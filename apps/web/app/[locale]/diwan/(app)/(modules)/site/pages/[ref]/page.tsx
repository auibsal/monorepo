import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PageEditor } from "@/components/nexus/admin/content/page-editor";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.content.tabs.pages")
);

const PageEditPage = async ({
  params,
}: {
  readonly params: Promise<{ ref: string }>;
}) => {
  const { ref } = await params;
  return (
    <RequireModule module="content">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back="/site"
          lookup={{ column: "slug", schema: "content", table: "pages" }}
          value={decodeURIComponent(ref)}
        >
          <PageEditor />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default PageEditPage;
