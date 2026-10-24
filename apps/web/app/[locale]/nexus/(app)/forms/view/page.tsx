import { Suspense } from "react";
import { ViewForm } from "@/components/nexus/forms/view";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.viewTitle"));

const ViewPage = () => (
  <Suspense>
    <ViewForm />
  </Suspense>
);

export default ViewPage;
