import { Service } from "@/components/diwan/service/service";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.service.rolesTitle"));

/**
 * /account/roles (decisions.md, The site): applications, then the roles
 * held, hours and service letters.
 */
const RolesPage = () => <Service />;

export default RolesPage;
