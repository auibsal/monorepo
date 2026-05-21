import Link from 'next/link';

import Logo from '../Logo';

export interface FooterProps {
  // 1. Locked down locale typing
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

export default function Footer({ locale, dictionary }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-auib-red border-auib-charcoal border-t-4 pb-8 pt-16 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="border-auib-charcoal mb-12 grid grid-cols-1 gap-12 border-b-2 pb-12 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo locale={locale} className="text-xl text-white" />
            </div>
            <p className="text-sm font-medium leading-relaxed text-white/80">
              {dictionary.description}
            </p>
          </div>

          <div className="md:col-span-1">
            {/* CRITICAL: Brutalist label style to fix WCAG contrast failure */}
            <h4 className="bg-auib-charcoal mb-6 inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              {dictionary.linksTitle}
            </h4>
            <ul className="space-y-3 text-sm font-bold uppercase tracking-wider text-white/80">
              {dictionary.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block transition-all hover:translate-x-1 hover:text-white rtl:hover:-translate-x-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-sm font-medium text-white/80 md:col-span-1">
            <h4 className="bg-auib-charcoal mb-6 inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
              {dictionary.contactTitle}
            </h4>
            <address className="not-italic leading-relaxed">
              {dictionary.university}
              <br />
              {dictionary.addressLine1}
              <br />
              {dictionary.addressLine2}
            </address>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-center text-xs font-bold uppercase tracking-wider text-white/60 md:flex-row md:text-left">
          <p>
            &copy; {year} {dictionary.societyName}. {dictionary.rights}
          </p>
          <p>{dictionary.designedBy}</p>
        </div>
      </div>
    </footer>
  );
}
