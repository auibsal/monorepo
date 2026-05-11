import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createEvents, EventAttributes } from 'ics';
import { Database } from 'database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return new NextResponse('Missing calendar token', { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = createClient<Database>(supabaseUrl, supabaseServiceRoleKey);

  // Validate the token against the users table
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('calendar_token', token)
    .single();

  if (userError || !user) {
    return new NextResponse('Invalid calendar token', { status: 401 });
  }

  // Fetch events
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .order('starts_at', { ascending: true });

  if (eventsError || !eventsData) {
    return new NextResponse('Failed to fetch events', { status: 500 });
  }

  // Map to ICS format
  const icsEvents: EventAttributes[] = eventsData.map((event) => {
    const evt = event as { starts_at: string; ends_at: string; title_en: string; description_en: string; location: string };
    const startDate = new Date(evt.starts_at);
    const endDate = new Date(evt.ends_at);

    return {
      title: evt.title_en,
      description: evt.description_en,
      location: evt.location,
      startInputType: 'utc',
      start: [
        startDate.getUTCFullYear(),
        startDate.getUTCMonth() + 1,
        startDate.getUTCDate(),
        startDate.getUTCHours(),
        startDate.getUTCMinutes(),
      ] as [number, number, number, number, number],
      startOutputType: 'utc',
      endInputType: 'utc',
      end: [
        endDate.getUTCFullYear(),
        endDate.getUTCMonth() + 1,
        endDate.getUTCDate(),
        endDate.getUTCHours(),
        endDate.getUTCMinutes(),
      ] as [number, number, number, number, number],
      endOutputType: 'utc',
    };
  });

  return new Promise<NextResponse>((resolve) => {
    if (icsEvents.length === 0) {
        // ics doesn't allow empty arrays, return an empty string for the content
        resolve(new NextResponse('', {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="events.ics"',
            },
        }));
        return;
    }

    createEvents(icsEvents, (error, value) => {
      if (error) {
        console.error(error);
        resolve(new NextResponse('Failed to generate calendar', { status: 500 }));
        return;
      }

      resolve(
        new NextResponse(value, {
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="events.ics"',
          },
        })
      );
    });
  });
}
