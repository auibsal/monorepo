import { RoleManual } from "@/components/diwan/admin/role-manual";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.admin.manual.title"));

/** /diwan/manual/<role> — the seat's manual for one of your roles. */
const ManualPage = async ({
  params,
}: {
  readonly params: Promise<{ assignment: string }>;
}) => {
  const { assignment } = await params;
  return <RoleManual assignmentId={assignment} />;
};

export default ManualPage;
