import React from 'react';

interface LogoProps {
  locale: string;
  className?: string;
}

export default function Logo({ locale, className = '' }: LogoProps) {
  return (
    <div
      className={`font-bold text-auib-charcoal ${className}`}
      style={{ letterSpacing: '0px', lineHeight: 1.4 }}
    >
      {locale === 'en' ? (
        <>
          AUIB<br />
          Society of<br />
          Arts and<br />
          Letters
        </>
      ) : (
        <>
          جمعيةُ الفنونِ<br />
          والآدابِ في<br />
          الجامعةِ<br />
          الأمريكيةِ
        </>
      )}
    </div>
  );
}
