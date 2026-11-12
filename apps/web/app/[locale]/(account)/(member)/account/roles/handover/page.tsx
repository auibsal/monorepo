import { FormRoute, type FormRouteProps } from "@/components/diwan/forms/route";

// Its query string (the role) decides what it shows, so it renders per request.
export const instant = false;

/** The handover, signed by the outgoing holder (decisions.md, Documents and forms). */
const Page = (props: FormRouteProps) => (
  <FormRoute formKey="handover" {...props} />
);

export default Page;
