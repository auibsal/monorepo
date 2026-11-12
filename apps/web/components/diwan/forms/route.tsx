import { FillForm } from "@/components/diwan/forms/fill";
import type { forms } from "@/lib/data";

export interface FormRouteProps {
  readonly searchParams: Promise<{ event?: string; link?: string }>;
}

/**
 * A form's page at its own address in its flow (a concern on Contact, a
 * trip's consent from its event, a parent's consent from its link): the one
 * standard form page, with no form number shown (decisions.md, Documents
 * and forms).
 */
export const FormRoute = async ({
  formKey,
  searchParams,
}: FormRouteProps & { readonly formKey: forms.FormKey }) => {
  const { event, link } = await searchParams;
  return (
    <FillForm eventSlug={event ?? null} formKey={formKey} link={link ?? null} />
  );
};
