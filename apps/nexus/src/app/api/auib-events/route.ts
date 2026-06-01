import { NextResponse } from 'next/server';

import ical from 'node-ical';

// CRITICAL: Force dynamic execution to bypass static build crashes
/**
 * dynamic
 *
 * @description Standardized execution for dynamic.
 */
export const dynamic = 'force-dynamic';
// CRITICAL: Explicitly lock the runtime to Node.js to protect node-ical from the Edge network
/**
 * runtime
 *
 * @description Standardized execution for runtime.
 */
export const runtime = 'nodejs';

// Define the exact shape we expect to extract from the node-ical parsing engine
interface ParsedVEvent {
  type: string;
  uid?: string;
  summary?: string | { val: string };
  start?: Date;
  end?: Date;
  location?: string;
  description?: string;
}

export async function GET() {
  try {
    // 1. Use native fetch to strictly engage the Next.js Data Cache for 1 hour
    const response = await fetch(
      'https://auib.edu.iq/?post_type=tribe_events&ical=1&eventDisplay=list',
      {
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch AUIB calendar: ${response.statusText}`);
    }

    const icsString = await response.text();

    // 2. Parse the raw string synchronously
    const events = ical.sync.parseICS(icsString);

    // 3. Clean and map the payload to prevent JSON serialization crashes
    const auibEvents = Object.values(events)
      // ⚡ Bolt Security Optimization: Strip 'any' and enforce strict interface boundaries
      .filter((event): event is ical.CalendarComponent => event?.type === 'VEVENT')
      .map((event) => {
        // Safely cast the validated event to our expected interface
        const vEvent = event as unknown as ParsedVEvent;

        return {
          id: vEvent.uid || crypto.randomUUID(), // Fallback to avoid React key errors if AUIB drops the UID
          title:
            typeof vEvent.summary === 'string'
              ? vEvent.summary
              : typeof vEvent.summary === 'object' && vEvent.summary !== null
                ? vEvent.summary.val
                : 'Untitled Event',
          // node-ical parses start/end as native JS Dates if formatted correctly
          start: vEvent.start instanceof Date ? vEvent.start.toISOString() : null,
          end: vEvent.end instanceof Date ? vEvent.end.toISOString() : null,
          location: vEvent.location || 'AUIB Campus',
          description: vEvent.description || '',
        };
      });

    return NextResponse.json(auibEvents);
  } catch (error) {
    console.error('Failed to parse AUIB calendar:', error);
    // Graceful degradation: return empty array so the client UI doesn't shatter
    return NextResponse.json([], { status: 500 });
  }
}
