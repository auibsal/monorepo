import React from 'react';
import Link from 'next/link';
import Logo from '../Logo';

export interface FooterProps {
  locale: string;
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
    <footer className="bg-auib-red text-white pt-16 pb-8 border-t-4 border-auib-charcoal">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 border-b-2 border-auib-charcoal pb-12">
          
          <div className="md:col-span-1">
            <div className="mb-6">
              <Logo locale={locale} className="text-xl text-white" />
            </div>
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              {dictionary.description}
            </p>
          </div>

          <div className="md:col-span-1">
            {/* CRITICAL: Brutalist label style to fix WCAG contrast failure */}
            <h4 className="inline-block bg-auib-charcoal text-white px-3 py-1 mb-6 text-xs font-bold uppercase tracking-widest">
              {dictionary.linksTitle}
            </h4>
            <ul className="space-y-3 text-sm font-bold uppercase tracking-wider text-white/80">
              {dictionary.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white hover:translate-x-1 rtl:hover:-translate-x-1 transition-all inline-block">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-1 text-sm font-medium text-white/80">
             <h4 className="inline-block bg-auib-charcoal text-white px-3 py-1 mb-6 text-xs font-bold uppercase tracking-widest">
               {dictionary.contactTitle}
             </h4>
             <address className="not-italic leading-relaxed">
               {dictionary.university}<br />
               {dictionary.addressLine1}<br />
               {dictionary.addressLine2}
             </address>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider text-white/60 flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {year} {dictionary.societyName}. {dictionary.rights}</p>
          <p className="mt-4 md:mt-0">{dictionary.designedBy}</p>
        </div>
      </div>
    </footer>
  );
}
