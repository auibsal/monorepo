import { notFound } from "next/navigation";

// Made on its first visit (its address names a record), then kept until
// it is published again.
export const instant = false;

// Unknown paths inside a locale render the localized not-found page.
const CatchAll = () => notFound();

export default CatchAll;
