import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { RequestPage } from "@/components/nexus/admin/forms/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.forms.requestTitle")
);

/** A motion for the General Assembly, on its own page under its queue. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ request: string }>;
}) => {
  const { request } = await params;
  return (
    <RequireModule module="forms">
      <RequestPage back="/society/meetings" id={request} />
    </RequireModule>
  );
};

export default Page;
