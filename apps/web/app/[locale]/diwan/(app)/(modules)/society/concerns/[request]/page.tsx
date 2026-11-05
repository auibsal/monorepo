import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { RequestPage } from "@/components/diwan/admin/forms/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.forms.requestTitle")
);

/** A concern, on its own page under its queue. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ request: string }>;
}) => {
  const { request } = await params;
  return (
    <RequireModule module="forms">
      <RequestPage back="/society/concerns" id={request} />
    </RequireModule>
  );
};

export default Page;
