import { DesignSystem } from "@/components/diwan/admin/system/design";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.admin.design.title"));

/**
 * The design system, SAL-MED-02, as the Diwan's own page: every officer may
 * open it. Each entry has its own address, /diwan/media/design/<entry>.
 */
const DesignPage = async ({
  params,
}: {
  readonly params: Promise<{ entry?: string[] }>;
}) => {
  const { entry } = await params;
  return <DesignSystem entryId={entry?.[0] ?? null} />;
};

export default DesignPage;
