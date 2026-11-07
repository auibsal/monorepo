import { TourStation } from "@/components/diwan/tour-station";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.station.title"));

/** The Tour's station, for its volunteers while their shift runs. */
const StationPage = () => <TourStation />;

export default StationPage;
