import { Suspense } from "react";
import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CallPage } from "@/components/nexus/admin/pipeline/calls";
import { RecordRef } from "@/components/nexus/record-ref";
import { SectionSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.pipeline.calls.title")
);

/** One of an Edition's calls, on its own page (new for a blank one). */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ call: string; ref: string }>;
}) => {
  const { call, ref } = await params;
  const edition = decodeURIComponent(ref);
  return (
    <RequireModule module="journal">
      <Suspense fallback={<SectionSpinner />}>
        <RecordRef
          back={`/qirtas/editions/${edition}`}
          lookup={{ column: "slug", schema: "journal", table: "issues" }}
          value={edition}
        >
          <CallPage back={`/qirtas/editions/${edition}`} callId={call} />
        </RecordRef>
      </Suspense>
    </RequireModule>
  );
};

export default Page;
