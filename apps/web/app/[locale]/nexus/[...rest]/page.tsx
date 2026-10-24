import { notFound } from "next/navigation";

// Unknown paths inside the Nexus render its not-found page.
const CatchAll = () => notFound();

export default CatchAll;
