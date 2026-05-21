import { NextResponse } from 'next/server';

import ical from 'node-ical';

// Ensure this API route is forced dynamic to avoid any Next.js caching or static generation bugs with node-ical
export const dynamic = 'force-dynamic';
// export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Use native fetch to strictly engage the Next.js Data Cache
    const response = await fetch(
      'https://auib.edu.iq/?post_type=tribe_events&ical=1&eventDisplay=list',
      {
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch AUIB calendar: ${response.statusText}`);
    }

    const icsString = await response.text();

    // 2. Parse the raw string synchronously
    const events = ical.sync.parseICS(icsString);

    // 3. Clean and map the payload to prevent JSON serialization crashes
    const auibEvents = Object.values(events)
      .filter((event): event is any => event?.type === 'VEVENT')
      .map((event: any) => ({
        id: event.uid,
        title:
          typeof event.summary === 'string'
            ? event.summary
            : (event.summary as any)?.val || 'Untitled Event',
        start: event.start?.toISOString() || null,
        end: event.end?.toISOString() || null,
        location: event.location || 'AUIB Campus',
        description: event.description || '',
      }));

    return NextResponse.json(auibEvents);
  } catch (error) {
    console.error('Failed to parse AUIB calendar:', error);
    return NextResponse.json([], { status: 500 });
  }
}
