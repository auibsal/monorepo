import { createAdminClient } from '@auibsal/auth/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAdminClient();

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('calendar_token', token)
      .single();

    if (userError || !user) {
      return new NextResponse('Unauthorized: Invalid or revoked calendar token.', { status: 401 });
    }

    // CRITICAL FIX: Explicitly request 'title_en' and 'description_en'
    // to perfectly map to your bilingual database schema.
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title_en, description_en, starts_at, ends_at, location')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true });

    if (eventsError) throw eventsError;

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
      const formatIcsDate = (dateString: string) => {
        return new Date(dateString).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      const dtStart = formatIcsDate(event.starts_at);
      const dtEnd = event.ends_at ? formatIcsDate(event.ends_at) : dtStart;

      const cleanText = (text: string) => text.replace(/\r/g, '').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

      icsString += `BEGIN:VEVENT${CRLF}`;
      icsString += `UID:${event.id}@auibsal.org${CRLF}`;
      icsString += `DTSTAMP:${formatIcsDate(new Date().toISOString())}${CRLF}`;
      icsString += `DTSTART:${dtStart}${CRLF}`;
      icsString += `DTEND:${dtEnd}${CRLF}`;

      // CRITICAL FIX: Rendering the English text values
      icsString += `SUMMARY:${cleanText(event.title_en)}${CRLF}`;
      if (event.description_en) {
        icsString += `DESCRIPTION:${cleanText(event.description_en)}${CRLF}`;
      }
      if (event.location) {
        icsString += `LOCATION:${cleanText(event.location)}${CRLF}`;
      }

      icsString += `STATUS:CONFIRMED${CRLF}`;
      icsString += `END:VEVENT${CRLF}`;
    });

    icsString += `END:VCALENDAR${CRLF}`;

    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="society-events.ics"',
        'Cache-Control': 'public, max-age=14400',
      },
    });
  } catch (error) {
    console.error('ICS Generation Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
