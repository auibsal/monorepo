import { Offers } from "@/components/nexus/offers/offers";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.offers.title"));

const OffersPage = () => <Offers />;

export default OffersPage;
