import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { ElectionRecord } from "@/components/diwan/admin/governance/elections";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.elections.title")
);

/** One election's record page. */
const ElectionPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return (
    <RequireModule module="governance">
      <ElectionRecord id={id} />
    </RequireModule>
  );
};

export default ElectionPage;
