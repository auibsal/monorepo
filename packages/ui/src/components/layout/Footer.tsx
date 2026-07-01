import Link from 'next/link';
import { Logo } from '../Logo';

/**
 * FooterProps
 *
 * @description Standardized execution for FooterProps.
 */
export interface FooterProps {
  locale: 'en' | 'ar';
  dictionary: {
    description: string;
    linksTitle: string;
    links: { label: string; href: string }[];
    contactTitle: string;
    university: string;
    addressLine1: string;
    addressLine2: string;
    societyName: string;
    rights: string;
    designedBy: string;
  };
}

/**
 * Footer
 *
 * @description Standardized execution for Footer.
 */
export function Footer({ locale, dictionary }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    // dir="auto" ensures BiDi address and description rendering is handled natively
    <footer
      dir="auto"
      className="border-t-4 border-auib-charcoal bg-auib-red pt-16 pb-8 text-white"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 grid grid-cols-1 gap-12 border-b-2 border-auib-charcoal pb-12 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo locale={locale} className="text-xl text-white" />
            </div>
            <p className="text-sm leading-relaxed font-medium text-white/80">
              {dictionary.description}
            </p>
          </div>

          <div className="md:col-span-1">
            <h4 className="mb-6 inline-block bg-auib-charcoal px-3 py-1 text-xs font-bold tracking-widest text-white uppercase">
              {dictionary.linksTitle}
            </h4>
            <ul className="space-y-3 text-sm font-bold tracking-wider text-white/80 uppercase">
              {dictionary.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm inline-block transition-all hover:translate-x-1 hover:text-white rtl:hover:-translate-x-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm font-medium text-white/80 md:col-span-1">
            <h4 className="mb-6 inline-block bg-auib-charcoal px-3 py-1 text-xs font-bold tracking-widest text-white uppercase">
              {dictionary.contactTitle}
            </h4>
            <address className="leading-relaxed not-italic">
              {dictionary.university}
              <br />
              {dictionary.addressLine1}
              <br />
              {dictionary.addressLine2}
            </address>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-center text-xs font-bold tracking-wider text-white/60 uppercase md:flex-row md:text-left">
          <p>
            &copy; {year} {dictionary.societyName}. {dictionary.rights}
          </p>
          <p>{dictionary.designedBy}</p>
        </div>
      </div>
    </footer>
  );
}
