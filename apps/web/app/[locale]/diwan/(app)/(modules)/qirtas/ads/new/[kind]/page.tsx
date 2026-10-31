import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AdEditor } from "@/components/nexus/admin/ads";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.ads.title"));

/** A new ad of one kind: /qirtas/ads/new/<kind>. */
const NewAdPage = async ({
  params,
}: {
  readonly params: Promise<{ kind: string }>;
}) => {
  const { kind } = await params;
  return (
    <RequireModule module="ads">
      <AdEditor kind={kind} />
    </RequireModule>
  );
};

export default NewAdPage;
