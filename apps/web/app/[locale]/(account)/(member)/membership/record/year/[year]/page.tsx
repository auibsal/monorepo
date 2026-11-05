import { recognition } from "@repo/sal-data";
import { notFound } from "next/navigation";
import { FIRST_YEAR, YearSummary } from "@/components/nexus/service/year";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.service.year.section")
);

const YEAR = /^\d{4}$/;

/** A member's year at the Society, to keep or print (the design review C23). */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ year: string }>;
}) => {
  const { year } = await params;
  const value = Number(year);
  if (
    !YEAR.test(year) ||
    value < FIRST_YEAR ||
    value > recognition.societyYearOf()
  ) {
    notFound();
  }
  return <YearSummary year={value} />;
};

export default Page;
