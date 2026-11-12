import { FormRoute, type FormRouteProps } from "@/components/diwan/forms/route";

// Its query string decides what it shows, so it renders per request.
export const instant = false;

const Page = (props: FormRouteProps) => <FormRoute formKey="f11" {...props} />;

export default Page;
