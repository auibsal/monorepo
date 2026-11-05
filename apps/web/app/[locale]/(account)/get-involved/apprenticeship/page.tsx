import { Apprenticeship } from "@/components/account/apprenticeship";
import { titleFrom } from "@/lib/diwan/metadata";

const metadataFrom = titleFrom((t) => t("diwan.apprenticeship.title"));

/** Public, like Get involved: search engines may list it. */
export const generateMetadata: typeof metadataFrom = async (props) => ({
  ...(await metadataFrom(props)),
  robots: { follow: true, index: true },
});

const ApprenticeshipPage = () => <Apprenticeship />;

export default ApprenticeshipPage;
