import { Service } from "@/components/nexus/service/service";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.service.title"));

const ServicePage = () => <Service />;

export default ServicePage;
