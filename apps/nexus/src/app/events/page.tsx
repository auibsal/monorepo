'use client';

import { useState, useEffect } from 'react';
import { createClient } from 'auth/client';
import { Event } from 'database';
import { CalendarDays, AlertCircle, X } from 'lucide-react';

interface AuibEvent {
  title?: string;
  start?: string | Date;
  end?: string | Date;
  location?: string;
  description?: string;
  [key: string]: unknown;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [auibEvents, setAuibEvents] = useState<AuibEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [createError, setCreateError] = useState('');

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [descEn, setDescEn] = useState('');
  const [descAr, setDescAr] = useState('');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isMembersOnly, setIsMembersOnly] = useState(false);

  const supabase = createClient();

  const fetchEvents = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });
    if (!error && data) {
      setEvents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const fetchAuibEvents = async () => {
      try {
        const res = await fetch('/api/auib-events');
        if (res.ok) {
          const data = await res.json();
          setAuibEvents(data);
        }
      } catch (e) {
        console.error("Failed to fetch auib events proxy", e);
      }
    };

    fetchEvents();
    fetchAuibEvents();
  }, []);

  // CRITICAL: Dedicated cancel handler to prevent state memory leaks
  const handleCloseModal = () => {
    setShowModal(false);
    setTitleEn(''); setTitleAr(''); setDescEn(''); setDescAr('');
    setLocation(''); setStartsAt(''); setEndsAt(''); setIsMembersOnly(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setCreateError('');

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
      console.error('Failed to create event', error);
      setCreateError('Failed to create event. Please check your inputs and try again.');
    } else {
      handleCloseModal();
      fetchEvents();
    }
  };

  return (
    <div>
      {createError ? (
        <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {createError}
        </div>
      ) : null}
      {/* Architectural Header */}
      <div className="flex justify-between items-center mb-10 border-b-4 border-auib-charcoal pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-auib-charcoal">Events Management</h2>
        <button
            onClick={() => setShowModal(true)}
            className="bg-auib-red text-white font-bold uppercase tracking-wider px-6 py-2 border-4 border-auib-charcoal hover:bg-white hover:text-auib-red transition-colors shadow-[6px_6px_0px_0px_#273237] hover:shadow-[8px_8px_0px_0px_#273237] hover:-translate-y-0.5">
            New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Society Events Feed */}
        <div>
            <h3 className="text-xl font-bold uppercase tracking-wide text-auib-charcoal mb-6 flex items-center gap-3">
                <CalendarDays className="text-auib-red" />
                Society Events
            </h3>
            <div className="bg-white border-4 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] overflow-x-auto text-auib-charcoal">
                <table className="w-full text-left border-collapse">
                <thead className="bg-auib-charcoal text-white border-b-4 border-auib-charcoal">
                    <tr>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Event</th>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Members Only</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-auib-charcoal">
                    {loading ? (
                        <tr>
                            <td className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/70" colSpan={3}>Loading events...</td>
                        </tr>
                    ) : events.length === 0 ? (
                        <tr>
                            <td className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/70" colSpan={3}>No upcoming society events.</td>
                        </tr>
                    ) : events.map(event => (
                         <tr key={event.id} className="hover:bg-auib-charcoal/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold">{event.title_en}</td>
                            <td className="px-6 py-4 text-sm font-bold text-auib-red">{new Date(event.starts_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-bold">
                                {event.is_members_only ? (
                                    <span className="bg-auib-charcoal text-white px-3 py-1.5 uppercase text-xs tracking-wider border-2 border-auib-charcoal shadow-[2px_2px_0px_0px_#273237]">Yes</span>
                                ) : (
                                    <span className="bg-white text-auib-charcoal px-3 py-1.5 uppercase text-xs tracking-wider border-2 border-auib-charcoal shadow-[2px_2px_0px_0px_#273237]">No</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>

        {/* AUIB Calendar Overlay */}
        <div>
            <h3 className="text-xl font-bold uppercase tracking-wide mb-2 text-auib-charcoal flex items-center gap-3">
                <AlertCircle className="text-auib-red" />
                AUIB Academic Calendar
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-auib-charcoal/60 mb-6">Check for conflicts before scheduling.</p>
            <div className="bg-white text-auib-charcoal border-4 border-auib-red shadow-[8px_8px_0px_0px_#9C213E] overflow-hidden max-h-[600px] overflow-y-auto">
                <ul className="divide-y-2 divide-auib-red/20">
                    {auibEvents.slice(0, 10).map((event) => {
                        // CRITICAL: Mapped to match our new Next.js API route payload
                        const evt = event as AuibEvent;
                        const eventKey = `${String(evt.title ?? 'untitled')}|${String(evt.start ?? 'no-start')}|${String(evt.end ?? 'no-end')}`;
                        return (
                        <li key={eventKey} className="p-5 hover:bg-auib-red/5 transition-colors">
                            <p className="font-bold text-sm uppercase tracking-wide leading-tight">{evt.title}</p>
                            <p className="text-xs font-bold text-auib-red mt-2 uppercase tracking-widest">
                                {evt.start ? new Date(evt.start).toLocaleDateString() : 'TBD'}
                            </p>
                        </li>
                    )})}
                    {auibEvents.length === 0 && (
                        <li className="p-6 text-sm font-bold uppercase tracking-widest text-center text-auib-charcoal/70">No events found or failed to load.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>

      {/* Brutalist Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-auib-charcoal/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white text-auib-charcoal p-8 md:p-12 border-4 border-auib-charcoal shadow-[16px_16px_0px_0px_#9C213E] max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
                
                <button onClick={handleCloseModal} aria-label="Close modal" className="absolute top-6 right-6 text-auib-charcoal hover:text-auib-red transition-colors">
                    <X size={32} strokeWidth={3} />
                </button>

                <h3 className="text-3xl font-bold mb-8 uppercase tracking-widest border-b-4 border-auib-charcoal pb-4 pr-12">Create New Event</h3>
                
                <form onSubmit={handleCreateEvent} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold uppercase tracking-wide">Title (EN)</label>
                            <input required type="text" value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold text-lg" />
                        </div>
                        <div className="space-y-3" dir="rtl">
                            <label className="block text-sm font-bold uppercase tracking-wide text-right">Title (AR)</label>
                            <input required type="text" value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold text-lg" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold uppercase tracking-wide">Description (EN)</label>
                            <textarea required value={descEn} onChange={e=>setDescEn(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none h-32 font-medium leading-relaxed resize-none" />
                        </div>
                        <div className="space-y-3" dir="rtl">
                            <label className="block text-sm font-bold uppercase tracking-wide text-right">Description (AR)</label>
                            <textarea required value={descAr} onChange={e=>setDescAr(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none h-32 font-medium leading-relaxed resize-none" />
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <label className="block text-sm font-bold uppercase tracking-wide">Location</label>
                        <input required type="text" value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="block text-sm font-bold uppercase tracking-wide">Starts At</label>
                            <input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold text-sm" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-bold uppercase tracking-wide">Ends At</label>
                            <input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="w-full p-4 border-2 border-auib-charcoal bg-white focus:outline-none focus:border-auib-red focus:ring-1 focus:ring-auib-red rounded-none font-bold text-sm" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-8 pt-8 border-t-4 border-auib-charcoal">
                        <input type="checkbox" id="membersOnly" checked={isMembersOnly} onChange={e=>setIsMembersOnly(e.target.checked)} className="w-6 h-6 text-auib-red border-2 border-auib-charcoal rounded-none focus:ring-auib-red focus:ring-offset-0" />
                        <label htmlFor="membersOnly" className="text-lg font-bold uppercase tracking-wider text-auib-charcoal cursor-pointer">Members Only Event</label>
                    </div>

                    <div className="flex justify-end gap-6 mt-12">
                        <button type="button" onClick={handleCloseModal} className="px-8 py-4 border-4 border-auib-charcoal text-auib-charcoal font-bold uppercase tracking-widest hover:bg-auib-charcoal hover:text-white transition-colors shadow-[6px_6px_0px_0px_#273237] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                            Cancel
                        </button>
                        <button type="submit" className="px-8 py-4 bg-auib-red text-white font-bold uppercase tracking-widest border-4 border-auib-charcoal shadow-[6px_6px_0px_0px_#273237] hover:bg-auib-charcoal transition-colors hover:shadow-none hover:translate-y-1 hover:translate-x-1">
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
