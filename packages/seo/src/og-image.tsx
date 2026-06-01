import { ImageResponse } from 'next/og';

/**
 * generateOGImage
 *
 * @description Standardized execution for generateOGImage.
 */
export function generateOGImage({
  title,
  author,
  type = 'Manuscript',
}: {
  title: string;
  author: string;
  type?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#000000', // Brutalist Black
          color: '#ffffff',
          padding: '64px',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #333', paddingBottom: '24px' }}>
          <span style={{ fontSize: 32, letterSpacing: '-0.05em' }}>AUIB Society of Arts & Letters</span>
          <span style={{ fontSize: 32, textTransform: 'uppercase', color: '#888' }}>{type}</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1 style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.05em', margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: 42, color: '#a1a1aa', margin: 0 }}>
            By {author}
          </p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
