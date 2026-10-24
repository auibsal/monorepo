import { Suspense } from "react";
import { FillForm } from "@/components/nexus/forms/fill";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.fillTitle"));

const FillPage = () => (
  <Suspense>
    <FillForm />
  </Suspense>
);

export default FillPage;
