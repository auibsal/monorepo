import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CRITICAL: Force dynamic execution so the feed updates in real-time
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  // Extract the dynamic route segment containing the user's cryptographic token
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Initialize Supabase Admin Client
  // We MUST use the service role key here because calendar clients (Apple/Google) 
  // do not send Supabase auth cookies. This allows us to securely bypass RLS 
  // to validate the token.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 2. Validate cryptographic token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('calendar_token', token)
      .single();

    if (userError || !user) {
      // Return standard 401 if the token is invalid, revoked, or missing
      return new NextResponse('Unauthorized: Invalid or revoked calendar token.', { status: 401 });
    }

    // 3. Fetch approved society events
    // Adjust these columns to match your exact Supabase 'events' schema
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title, description, starts_at, ends_at, location')
      .gte('starts_at', new Date().toISOString()) // Only fetch current/future events
      .order('starts_at', { ascending: true });

    if (eventsError) throw eventsError;

    // 4. Construct the raw ICS String
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

    // Map each database row to a VEVENT block
    events?.forEach((event) => {
      // ICS requires exact date formatting (YYYYMMDDThhmmssZ)
      const formatIcsDate = (dateString: string) => {
        return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const dtStart = formatIcsDate(event.starts_at);
      const dtEnd = event.ends_at ? formatIcsDate(event.ends_at) : dtStart; // Fallback if no end time
      
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

    // 5. Inject the strict Calendar MIME type
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
