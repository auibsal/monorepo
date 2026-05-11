import React from 'react';

interface LogoProps {
  locale: string;
  className?: string;
}

export default function Logo({ locale, className = '' }: LogoProps) {
  return (
    <div
      className={`font-bold ${className}`}
      style={{ letterSpacing: '0px' }}
    >
      {locale === 'en' ? (
        <span className="leading-[1.4] block">
          AUIB<br />
          Society of<br />
          Arts and<br />
          Letters
        </span>
      ) : (
        <span className="leading-[1.4] block">
          جمعيةُ الفنونِ<br />
          والآدابِ في<br />
          الجامعةِ<br />
          الأمريكيةِ
        </span>
      )}
    </div>
  );
}
