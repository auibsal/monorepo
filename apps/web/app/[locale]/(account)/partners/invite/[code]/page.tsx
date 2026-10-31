import { PartnerInvite } from "@/components/account/partner-invite";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.partnerInvite.title")
);

const Page = async ({ params }: { params: Promise<{ code: string }> }) => {
  const { code } = await params;
  return (
    <main
      className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
      id="main"
    >
      <PartnerInvite code={code} />
    </main>
  );
};

export default Page;
