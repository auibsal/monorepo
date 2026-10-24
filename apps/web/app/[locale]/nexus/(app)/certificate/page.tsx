import { Suspense } from "react";
import { Certificate } from "@/components/nexus/certificates/certificate";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.certificate.title"));

const CertificatePage = () => (
  <Suspense>
    <Certificate />
  </Suspense>
);

export default CertificatePage;
