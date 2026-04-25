import { getLocale } from 'next-intl/server';
import BylawsEN from 'EN';
import BylawsAR from 'AR';

// This is a Server Component. It calculates the locale instantly on the server
// and only sends the correct language component to the browser, saving bandwidth.
export default async function OfficialBylawsPage() {
  const locale = await getLocale();

  if (locale === 'ar') {
    return <BylawsAR />;
  }

  return <BylawsEN />;
}
