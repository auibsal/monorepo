import { NextResponse } from 'next/server';
import ical from 'node-ical';

export const revalidate = 3600; // revalidate every hour

export async function GET() {
  try {
    const events = await ical.async.fromURL('https://auib.edu.iq/?post_type=tribe_events&ical=1&eventDisplay=list');
    const auibEvents = Object.values(events).filter((event) => event && event.type === 'VEVENT');
    return NextResponse.json(auibEvents);
  } catch (error) {
    console.error('Failed to fetch AUIB calendar:', error);
    return NextResponse.json([], { status: 500 });
  }
}
