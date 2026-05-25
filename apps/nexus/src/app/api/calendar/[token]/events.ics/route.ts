import { NextResponse } from 'next/server';

// 1. Import your newly centralized Admin Client from the shared workspace
import { createAdminClient } from '@auibsal/auth/admin';

// CRITICAL: Force dynamic execution so the feed updates in real-time
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  // Next.js 15 strictly requires params to be awaited
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 2. Instantiate the Admin client without needing local dependencies.
  // This safely bypasses RLS for cookie-less calendar clients (Apple/Google).
  const supabase = createAdminClient();

  try {
    // Validate cryptographic token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('calendar_token', token)
      .single();

    if (userError || !user) {
      return new NextResponse('Unauthorized: Invalid or revoked calendar token.', { status: 401 });
    }

    // Fetch approved society events
    // Adjust columns here to perfectly match your database schema
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, starts_at, ends_at, location')
      .gte('starts_at', new Date().toISOString()) // Only fetch current/future events
      .order('starts_at', { ascending: true });

    if (eventsError) throw eventsError;

    // Construct the raw ICS String
    // iCalendar format strictly requires \r\n (CRLF) line endings
    const CRLF = '\r\n';
    let icsString = '';

    icsString += `BEGIN:VCALENDAR${CRLF}`;
    icsString += `VERSION:2.0${CRLF}`;
    icsString += `PRODID:-//AUIB Society of Arts and Letters//Nexus//EN${CRLF}`;
    icsString += `CALSCALE:GREGORIAN${CRLF}`;
    icsString += `METHOD:PUBLISH${CRLF}`;
    icsString += `X-WR-CALNAME:Society Events${CRLF}`;
    icsString += `X-WR-TIMEZONE:Asia/Baghdad${CRLF}`;

    events?.forEach((event) => {
      // ICS requires exact date formatting (YYYYMMDDThhmmssZ)
      const formatIcsDate = (dateString: string) => {
        return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const dtStart = formatIcsDate(event.starts_at);
      const dtEnd = event.ends_at ? formatIcsDate(event.ends_at) : dtStart; 
      
      // Clean string payloads to prevent ICS syntax breaking
      const cleanText = (text: string) => text.replace(/\n/g, '\\n').replace(/,/g, '\\,');

      icsString += `BEGIN:VEVENT${CRLF}`;
      icsString += `UID:${event.id}@auibsal.org${CRLF}`;
      icsString += `DTSTAMP:${formatIcsDate(new Date().toISOString())}${CRLF}`;
      icsString += `DTSTART:${dtStart}${CRLF}`;
      icsString += `DTEND:${dtEnd}${CRLF}`;
      icsString += `SUMMARY:${cleanText(event.title)}${CRLF}`;
      if (event.description) icsString += `DESCRIPTION:${cleanText(event.description)}${CRLF}`;
      if (event.location) icsString += `LOCATION:${cleanText(event.location)}${CRLF}`;
      icsString += `STATUS:CONFIRMED${CRLF}`;
      icsString += `END:VEVENT${CRLF}`;
    });

    icsString += `END:VCALENDAR${CRLF}`;

    // Inject the strict Calendar MIME type and caching headers
    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="society-events.ics"',
        // Tell external caching layers (like Google Calendar) to refresh every 4 hours
        'Cache-Control': 'public, max-age=14400',
      },
    });
  } catch (error) {
    console.error('ICS Generation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
