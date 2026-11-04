import { StandForOffice } from "@/components/nexus/society/elections";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.society.elections.stand")
);

/** Standing for one position, on its own page under Society. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ position: string }>;
}) => {
  const { position } = await params;
  return <StandForOffice positionId={position} />;
};

export default Page;
