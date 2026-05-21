'use client';

import { useEffect, useState } from 'react';

import { AlertCircle, CalendarDays, X } from 'lucide-react';

import { createClient } from '@auibsal/auth/client';
import { Event } from '@auibsal/database';

export default function EventsPage() {
  const [events, setEvents] = useState<
    Pick<Event, 'id' | 'title_en' | 'starts_at' | 'is_members_only'>[]
  >([]);
  const [auibEvents, setAuibEvents] = useState<any[]>([]);
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

  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
    fetchAuibEvents();
  }, []);

  const fetchEvents = async () => {
    if (!supabase) return;
    // ⚡ Bolt Performance Optimization: Explicitly select only the required fields to prevent over-fetching large 'description_en' and 'description_ar' fields in this list view.
    const { data, error } = await supabase
      .from('events')
      .select('id, title_en, starts_at, is_members_only')
      .order('starts_at', { ascending: true });
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  const fetchAuibEvents = async () => {
    try {
      const res = await fetch('/api/auib-events');
      if (res.ok) {
        const data = await res.json();
        setAuibEvents(data);
      }
    } catch (e) {
      console.error('Failed to fetch auib events proxy', e);
    }
  };

  // CRITICAL: Dedicated cancel handler to prevent state memory leaks
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
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const { error } = await supabase.from('events').insert({
      title_en: titleEn,
      title_ar: titleAr,
      description_en: descEn,
      description_ar: descAr,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
      is_members_only: isMembersOnly,
      cover_image_url: '',
    });

    if (error) {
      alert('Error creating event: ' + error.message);
    } else {
      handleCloseModal();
      fetchEvents();
    }
  };

  return (
    <div>
      {/* Architectural Header */}
      <div className="border-auib-charcoal mb-10 flex items-center justify-between border-b-4 pb-4">
        <h2 className="text-auib-charcoal text-3xl font-bold uppercase tracking-widest">
          Events Management
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-auib-red border-auib-charcoal hover:text-auib-red border-4 px-6 py-2 font-bold uppercase tracking-wider text-white shadow-[6px_6px_0px_0px_#273237] transition-colors hover:-translate-y-0.5 hover:bg-white hover:shadow-[8px_8px_0px_0px_#273237]"
        >
          New Event
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Society Events Feed */}
        <div>
          <h3 className="text-auib-charcoal mb-6 flex items-center gap-3 text-xl font-bold uppercase tracking-wide">
            <CalendarDays className="text-auib-red" />
            Society Events
          </h3>
          <div className="border-auib-charcoal text-auib-charcoal overflow-x-auto border-4 bg-white shadow-[8px_8px_0px_0px_#273237]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-auib-charcoal border-auib-charcoal border-b-4 text-white">
                <tr>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Event</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Date</th>
                  <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">
                    Members Only
                  </th>
                </tr>
              </thead>
              <tbody className="divide-auib-charcoal divide-y-2">
                {loading ? (
                  <tr>
                    <td
                      className="text-auib-charcoal/70 px-6 py-8 text-center text-sm font-bold uppercase tracking-widest"
                      colSpan={3}
                    >
                      Loading events...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td
                      className="text-auib-charcoal/70 px-6 py-8 text-center text-sm font-bold uppercase tracking-widest"
                      colSpan={3}
                    >
                      No upcoming society events.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id} className="hover:bg-auib-charcoal/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold">{event.title_en}</td>
                      <td className="text-auib-red px-6 py-4 text-sm font-bold">
                        {new Date(event.starts_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold">
                        {event.is_members_only ? (
                          <span className="bg-auib-charcoal border-auib-charcoal border-2 px-3 py-1.5 text-xs uppercase tracking-wider text-white shadow-[2px_2px_0px_0px_#273237]">
                            Yes
                          </span>
                        ) : (
                          <span className="text-auib-charcoal border-auib-charcoal border-2 bg-white px-3 py-1.5 text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_#273237]">
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
          <h3 className="text-auib-charcoal mb-2 flex items-center gap-3 text-xl font-bold uppercase tracking-wide">
            <AlertCircle className="text-auib-red" />
            AUIB Academic Calendar
          </h3>
          <p className="text-auib-charcoal/60 mb-6 text-sm font-bold uppercase tracking-widest">
            Check for conflicts before scheduling.
          </p>
          <div className="text-auib-charcoal border-auib-red max-h-[600px] overflow-hidden overflow-y-auto border-4 bg-white shadow-[8px_8px_0px_0px_#9C213E]">
            <ul className="divide-auib-red/20 divide-y-2">
              {auibEvents.slice(0, 10).map((event, i) => {
                // CRITICAL: Mapped to match our new Next.js API route payload
                const evt = event as { title?: string; start?: string | Date };
                return (
                  <li key={i} className="hover:bg-auib-red/5 p-5 transition-colors">
                    <p className="text-sm font-bold uppercase leading-tight tracking-wide">
                      {evt.title}
                    </p>
                    <p className="text-auib-red mt-2 text-xs font-bold uppercase tracking-widest">
                      {evt.start ? new Date(evt.start).toLocaleDateString() : 'TBD'}
                    </p>
                  </li>
                );
              })}
              {auibEvents.length === 0 && (
                <li className="text-auib-charcoal/70 p-6 text-center text-sm font-bold uppercase tracking-widest">
                  No events found or failed to load.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Brutalist Creation Modal */}
      {showModal && (
        <div className="bg-auib-charcoal/90 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="text-auib-charcoal border-auib-charcoal relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-4 bg-white p-8 shadow-[16px_16px_0px_0px_#9C213E] md:p-12">
            <button
              onClick={handleCloseModal}
              aria-label="Close modal"
              className="text-auib-charcoal hover:text-auib-red absolute right-6 top-6 transition-colors"
            >
              <X size={32} strokeWidth={3} />
            </button>

            <h3 className="border-auib-charcoal mb-8 border-b-4 pb-4 pr-12 text-3xl font-bold uppercase tracking-widest">
              Create New Event
            </h3>

            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="titleEn"
                    className="block text-sm font-bold uppercase tracking-wide"
                  >
                    Title (EN) <span className="text-auib-red">*</span>
                  </label>
                  <input
                    id="titleEn"
                    required
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 text-lg font-bold focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="space-y-3" dir="rtl">
                  <label
                    htmlFor="titleAr"
                    className="block text-right text-sm font-bold uppercase tracking-wide"
                  >
                    Title (AR) <span className="text-auib-red">*</span>
                  </label>
                  <input
                    id="titleAr"
                    required
                    type="text"
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 text-lg font-bold focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="descEn"
                    className="block text-sm font-bold uppercase tracking-wide"
                  >
                    Description (EN) <span className="text-auib-red">*</span>
                  </label>
                  <textarea
                    id="descEn"
                    required
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red h-32 w-full resize-none rounded-none border-2 bg-white p-4 font-medium leading-relaxed focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="space-y-3" dir="rtl">
                  <label
                    htmlFor="descAr"
                    className="block text-right text-sm font-bold uppercase tracking-wide"
                  >
                    Description (AR) <span className="text-auib-red">*</span>
                  </label>
                  <textarea
                    id="descAr"
                    required
                    value={descAr}
                    onChange={(e) => setDescAr(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red h-32 w-full resize-none rounded-none border-2 bg-white p-4 font-medium leading-relaxed focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="location"
                  className="block text-sm font-bold uppercase tracking-wide"
                >
                  Location <span className="text-auib-red">*</span>
                </label>
                <input
                  id="location"
                  required
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 font-bold focus:outline-none focus:ring-1"
                />
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label
                    htmlFor="startsAt"
                    className="block text-sm font-bold uppercase tracking-wide"
                  >
                    Starts At <span className="text-auib-red">*</span>
                  </label>
                  <input
                    id="startsAt"
                    required
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 text-sm font-bold focus:outline-none focus:ring-1"
                  />
                </div>
                <div className="space-y-3">
                  <label
                    htmlFor="endsAt"
                    className="block text-sm font-bold uppercase tracking-wide"
                  >
                    Ends At <span className="text-auib-red">*</span>
                  </label>
                  <input
                    id="endsAt"
                    required
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="border-auib-charcoal focus:border-auib-red focus:ring-auib-red w-full rounded-none border-2 bg-white p-4 text-sm font-bold focus:outline-none focus:ring-1"
                  />
                </div>
              </div>

              <div className="border-auib-charcoal mt-8 flex items-center gap-4 border-t-4 pt-8">
                <input
                  type="checkbox"
                  id="membersOnly"
                  checked={isMembersOnly}
                  onChange={(e) => setIsMembersOnly(e.target.checked)}
                  className="text-auib-red border-auib-charcoal focus:ring-auib-red h-6 w-6 rounded-none border-2 focus:ring-offset-0"
                />
                <label
                  htmlFor="membersOnly"
                  className="text-auib-charcoal cursor-pointer text-lg font-bold uppercase tracking-wider"
                >
                  Members Only Event
                </label>
              </div>

              <div className="mt-12 flex justify-end gap-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="border-auib-charcoal text-auib-charcoal hover:bg-auib-charcoal border-4 px-8 py-4 font-bold uppercase tracking-widest shadow-[6px_6px_0px_0px_#273237] transition-colors hover:translate-x-1 hover:translate-y-1 hover:text-white hover:shadow-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-auib-red border-auib-charcoal hover:bg-auib-charcoal border-4 px-8 py-4 font-bold uppercase tracking-widest text-white shadow-[6px_6px_0px_0px_#273237] transition-colors hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
