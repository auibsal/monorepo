import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { TourCards } from "@/components/diwan/admin/programmes/six-words";
import { TourImport } from "@/components/diwan/admin/programmes/tour-import";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.tour")
);

/**
 * The Typewriter Tour in the Diwan (owner, Nov 5, 2026): it belongs to
 * membership, so its Six Words are kept under People by the General
 * Secretary and the Tour Lead (`tour.run`), with the spring 2026 import
 * and the invitations the President sends.
 */
const TypewriterTourPage = () => (
  <RequireModule module="tour">
    <div className="grid gap-12">
      <TourCards />
      <TourImport />
    </div>
  </RequireModule>
);

export default TypewriterTourPage;
