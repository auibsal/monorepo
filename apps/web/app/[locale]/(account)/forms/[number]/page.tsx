import { notFound } from "next/navigation";
import { FillForm } from "@/components/diwan/forms/fill";
import { forms } from "@/lib/data";

// Its query string decides what it shows, so it renders per request.
export const instant = false;

interface PageProps {
  readonly params: Promise<{ number: string }>;
  readonly searchParams: Promise<{ event?: string; link?: string }>;
}

/**
 * A form, signed on the site: /forms/F-45 (decisions.md). One page
 * for every form signed here, for members, guests, parents and partners.
 */
const Page = async ({ params, searchParams }: PageProps) => {
  const { number } = await params;
  const { event, link } = await searchParams;
  const key = forms.keyFromNumber(decodeURIComponent(number));
  if (!forms.isFormKey(key)) {
    notFound();
  }
  return (
    <FillForm eventSlug={event ?? null} formKey={key} link={link ?? null} />
  );
};

export default Page;
