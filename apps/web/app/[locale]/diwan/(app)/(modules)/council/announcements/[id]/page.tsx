import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { AnnouncementRecord } from "@/components/diwan/admin/governance/announcements";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.announcements")
);

/** One announcement's record page, or "new" for a blank one. */
const AnnouncementPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  return (
    <RequireModule module="media">
      <AnnouncementRecord id={id} />
    </RequireModule>
  );
};

export default AnnouncementPage;
