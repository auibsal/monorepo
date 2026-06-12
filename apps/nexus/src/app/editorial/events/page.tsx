'use client';

import { createClient } from '@auibsal/auth/client';
import type { Tables } from '@auibsal/database/types';
import { AlertCircle, AlertTriangle, CalendarDays, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

// Strictly define the shape returning from your Next.js API proxy
type AuibEvent = {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string;
  description: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Pick<Tables<'events'>, 'id' | 'title_en' | 'starts_at' | 'is_members_only'>[]>([]);
  const [auibEvents, setAuibEvents] = useState<AuibEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isMembersOnly, setIsMembersOnly] = useState(false);

  // State-driven error handling
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  // CRITICAL FIX: Wrapped fetchers in useCallback to satisfy strict React concurrency rules
  const fetchEvents = useCallback(async () => {
    if (!supabase) return;

    // ⚡ Bolt Optimization: Reduced payload size by explicitly selecting only required columns instead of '*'
    const { data, error } = await supabase
      .from('events')
      .select('id, title_en, starts_at, is_members_only')
      .order('starts_at', { ascending: true });
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  }, [supabase]);

  const fetchAuibEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/auib-events');
      if (res.ok) {
        const data = await res.json();
        // Type cast the validated payload
        setAuibEvents(data as AuibEvent[]);
      }
    } catch (e) {
      console.error('Failed to fetch auib events proxy', e);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchAuibEvents();
  }, [fetchEvents, fetchAuibEvents]);

  const handleCloseModal = () => {
    setShowModal(false);
    setTitleEn('');
    setTitleAr('');
    setDescEn('');
    setDescAr('');
    setLocation('');
    setStartsAt('');
    setEndsAt('');
    setIsMembersOnly(false);
    setErrorMessage('');
    setIsSaving(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setIsSaving(true);
    setErrorMessage('');

    try {
      // CRITICAL FIX: Convert the local datetime string into a strict UTC ISO string
      // This mathematically guarantees Postgres stores the exact absolute time, regardless of server location.
      const isoStartsAt = new Date(startsAt).toISOString();
      const isoEndsAt = new Date(endsAt).toISOString();

      const { error } = await supabase.from('events').insert({
        title_en: titleEn,
        title_ar: titleAr,
        description_en: descEn,
        description_ar: descAr,
        location,
        starts_at: isoStartsAt,
        ends_at: isoEndsAt,
        is_members_only: isMembersOnly,
        cover_image_url: '',
      });

      if (error) throw error;

      handleCloseModal();
      fetchEvents();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unknown exception occurred during transmission.',
      );
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Architectural Header */}
      <div className="mb-10 flex items-center justify-between border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold tracking-widest text-foreground uppercase">
          Events Management
        </h2>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="border-4 border-border bg-primary px-6 py-2 font-bold tracking-wider text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-colors hover:-translate-y-0.5 hover:bg-background hover:text-primary hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]"
        >
          New Event
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Society Events Feed */}
        <div>
          <h3 className="mb-6 flex items-center gap-3 text-xl font-bold tracking-wide text-foreground uppercase">
            <CalendarDays className="text-primary" />
            Society Events
          </h3>
          <div className="overflow-x-auto border-4 border-border bg-card text-foreground shadow-[8px_8px_0px_0px_var(--brutalist-shadow)]">
            <table className="w-full border-collapse text-left">
              <thead className="border-b-4 border-border bg-foreground text-background">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Event</th>
                  <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">Date</th>
                  <th className="px-6 py-4 text-sm font-bold tracking-wide uppercase">
                    Members Only
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-border">
                {loading ? (
                  <tr>
                    <td className="p-8" colSpan={3}>
                      {/* CRITICAL FIX: Standardized Brutalist Loading State */}
                      <div className="flex animate-pulse items-center justify-center gap-3 text-sm font-bold tracking-widest text-foreground/50 uppercase">
                        <div className="h-4 w-4 animate-spin rounded-none bg-primary"></div>
                        Polling Database...
                      </div>
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-8 text-center text-sm font-bold tracking-widest text-foreground/70 uppercase"
                      colSpan={3}
                    >
                      No upcoming society events.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="transition-colors hover:bg-foreground/5">
                      <td className="px-6 py-4 text-sm font-bold">{event.title_en}</td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">
                        {new Date(event.starts_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {event.is_members_only ? (
                          <span className="border-2 border-border bg-foreground px-3 py-1.5 text-xs tracking-wider text-background uppercase shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
                            Yes
                          </span>
                        ) : (
                          <span className="border-2 border-border bg-card px-3 py-1.5 text-xs tracking-wider text-foreground uppercase shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">
                            No
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AUIB Calendar Overlay */}
        <div>
          <h3 className="mb-2 flex items-center gap-3 text-xl font-bold tracking-wide text-foreground uppercase">
            <AlertCircle className="text-primary" />
            AUIB Academic Calendar
          </h3>
          <p className="mb-6 text-sm font-bold tracking-widest text-foreground/60 uppercase">
            Check for conflicts before scheduling.
          </p>
          <div className="max-h-[600px] overflow-hidden overflow-y-auto border-4 border-primary bg-card text-foreground shadow-[8px_8px_0px_0px_var(--primary)]">
            <ul className="divide-y-2 divide-primary/20">
              {auibEvents.slice(0, 10).map((evt) => (
                <li key={evt.id} className="p-5 transition-colors hover:bg-primary/5">
                  <p className="text-sm leading-tight font-bold tracking-wide uppercase">
                    {evt.title}
                  </p>
                  <p className="mt-2 text-xs font-bold tracking-widest text-primary uppercase">
                    {evt.start ? new Date(evt.start).toLocaleDateString() : 'TBD'}
                  </p>
                </li>
              ))}
              {auibEvents.length === 0 && (
                <li className="p-6 text-center text-sm font-bold tracking-widest text-foreground/70 uppercase">
                  No events found or failed to load.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Brutalist Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-4 border-border bg-card p-8 text-foreground shadow-[16px_16px_0px_0px_var(--primary)] md:p-12">
            <button
              type="button"
              onClick={handleCloseModal}
              aria-label="Close modal"
              className="absolute top-6 right-6 text-foreground transition-colors hover:text-primary"
            >
              <X size={32} strokeWidth={3} />
            </button>

            <h3 className="mb-8 border-b-4 border-border pr-12 pb-4 text-3xl font-bold tracking-widest uppercase">
              Create New Event
            </h3>

            {errorMessage && (
              <div className="mb-8 flex items-center gap-3 border-4 border-red-500 bg-background p-4 text-sm font-bold text-red-500">
                <AlertTriangle size={20} className="flex-shrink-0" />
                <span className="break-words">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="titleEn"
                    className="block text-sm font-bold tracking-wide uppercase"
                  >
                    Title (EN) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="titleEn"
                    required
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="w-full rounded-none border-2 border-border bg-background p-4 text-lg font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-3" dir="rtl">
                  <label
                    htmlFor="titleAr"
                    className="block text-right text-sm font-bold tracking-wide uppercase"
                  >
                    Title (AR) <span className="text-primary">*</span>
                  </label>
                  <input
                    id="titleAr"
                    required
                    type="text"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full rounded-none border-2 border-border bg-background p-4 text-lg font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="descEn"
                    className="block text-sm font-bold tracking-wide uppercase"
                  >
                    Description (EN) <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="descEn"
                    required
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    className="h-32 w-full resize-none rounded-none border-2 border-border bg-background p-4 leading-relaxed font-medium text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-3" dir="rtl">
                  <label
                    htmlFor="descAr"
                    className="block text-right text-sm font-bold tracking-wide uppercase"
                  >
                    Description (AR) <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="descAr"
                    required
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    className="h-32 w-full resize-none rounded-none border-2 border-border bg-background p-4 leading-relaxed font-medium text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="location"
                  className="block text-sm font-bold tracking-wide uppercase"
                >
                  Location <span className="text-primary">*</span>
                </label>
                <input
                  id="location"
                  required
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-none border-2 border-border bg-background p-4 font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="startsAt"
                    className="block text-sm font-bold tracking-wide uppercase"
                  >
                    Starts At <span className="text-primary">*</span>
                  </label>
                  <input
                    id="startsAt"
                    required
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full rounded-none border-2 border-border bg-background p-4 text-sm font-bold text-foreground [color-scheme:light_dark] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-3">
                  <label
                    htmlFor="endsAt"
                    className="block text-sm font-bold tracking-wide uppercase"
                  >
                    Ends At <span className="text-primary">*</span>
                  </label>
                  <input
                    id="endsAt"
                    required
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full rounded-none border-2 border-border bg-background p-4 text-sm font-bold text-foreground [color-scheme:light_dark] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center gap-4 border-t-4 border-border pt-8">
                <input
                  type="checkbox"
                  id="membersOnly"
                  checked={isMembersOnly}
                  onChange={(e) => setIsMembersOnly(e.target.checked)}
                  className="h-6 w-6 rounded-none border-2 border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                />
                <label
                  htmlFor="membersOnly"
                  className="cursor-pointer text-lg font-bold tracking-wider text-foreground uppercase"
                >
                  Members Only Event
                </label>
              </div>

              <div className="mt-12 flex justify-end gap-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="border-4 border-border px-8 py-4 font-bold tracking-widest text-foreground uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-colors hover:translate-x-1 hover:translate-y-1 hover:bg-foreground hover:text-background hover:shadow-none disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-3 border-4 border-border bg-primary px-8 py-4 font-bold tracking-widest text-background uppercase shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] transition-colors hover:translate-x-1 hover:translate-y-1 hover:bg-foreground hover:shadow-none disabled:opacity-50"
                >
                  {isSaving && (
                    <div className="h-4 w-4 animate-spin rounded-none bg-background"></div>
                  )}
                  {isSaving ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
