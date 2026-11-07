import { Service } from "@/components/diwan/service/service";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.service.title"));

const ServicePage = () => <Service />;

export default ServicePage;
