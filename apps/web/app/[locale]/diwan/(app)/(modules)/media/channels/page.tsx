import { Channels } from "@/components/diwan/admin/system/channels";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.channels")
);

/**
 * Hudhud's groups and the exempt list (decisions §6, §18): kept here, never
 * typed as commands in the chat. RLS decides what each officer sees.
 */
const ChannelsPage = () => <Channels />;

export default ChannelsPage;
