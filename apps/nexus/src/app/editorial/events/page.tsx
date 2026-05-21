'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@auibsal/auth/client';
import { Event } from '@auibsal/database';
import { CalendarDays, AlertCircle, X, AlertTriangle } from 'lucide-react';

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
  const [events, setEvents] = useState<Event[]>([]);
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
  
  // Replaced native alert with state-driven error handling
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
    fetchAuibEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEvents = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });
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
           // Type cast the validated payload
           setAuibEvents(data as AuibEvent[]);
       }
     } catch(e) {
       console.error("Failed to fetch auib events proxy", e);
     }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTitleEn(''); setTitleAr(''); setDescEn(''); setDescAr('');
    setLocation(''); setStartsAt(''); setEndsAt(''); setIsMembersOnly(false);
    setErrorMessage('');
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setErrorMessage('');

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
      setErrorMessage(error.message);
    } else {
      handleCloseModal();
      fetchEvents();
    }
  };

  return (
    <div>
      {/* Architectural Header */}
      <div className="flex justify-between items-center mb-10 border-b-4 border-border pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-widest text-foreground">Events Management</h2>
        <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-background font-bold uppercase tracking-wider px-6 py-2 border-4 border-border hover:bg-background hover:text-primary transition-colors shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] hover:-translate-y-0.5">
            New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Society Events Feed */}
        <div>
            <h3 className="text-xl font-bold uppercase tracking-wide text-foreground mb-6 flex items-center gap-3">
                <CalendarDays className="text-primary" />
                Society Events
            </h3>
            <div className="bg-card border-4 border-border shadow-[8px_8px_0px_0px_var(--brutalist-shadow)] overflow-x-auto text-foreground">
                <table className="w-full text-left border-collapse">
                <thead className="bg-foreground text-background border-b-4 border-border">
                    <tr>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Event</th>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Date</th>
                    <th className="px-6 py-4 text-sm font-bold uppercase tracking-wide">Members Only</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-border">
                    {loading ? (
                        <tr>
                            <td className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-foreground/70" colSpan={3}>Loading events...</td>
                        </tr>
                    ) : events.length === 0 ? (
                        <tr>
                            <td className="px-6 py-8 text-sm font-bold uppercase tracking-widest text-center text-foreground/70" colSpan={3}>No upcoming society events.</td>
                        </tr>
                    ) : events.map(event => (
                         <tr key={event.id} className="hover:bg-foreground/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-bold">{event.title_en}</td>
                            <td className="px-6 py-4 text-sm font-bold text-primary">{new Date(event.starts_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-bold">
                                {event.is_members_only ? (
                                    <span className="bg-foreground text-background px-3 py-1.5 uppercase text-xs tracking-wider border-2 border-border shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">Yes</span>
                                ) : (
                                    <span className="bg-card text-foreground px-3 py-1.5 uppercase text-xs tracking-wider border-2 border-border shadow-[2px_2px_0px_0px_var(--brutalist-shadow)]">No</span>
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
            <h3 className="text-xl font-bold uppercase tracking-wide mb-2 text-foreground flex items-center gap-3">
                <AlertCircle className="text-primary" />
                AUIB Academic Calendar
            </h3>
            <p className="text-sm font-bold uppercase tracking-widest text-foreground/60 mb-6">Check for conflicts before scheduling.</p>
            <div className="bg-card text-foreground border-4 border-primary shadow-[8px_8px_0px_0px_var(--primary)] overflow-hidden max-h-[600px] overflow-y-auto">
                <ul className="divide-y-2 divide-primary/20">
                    {auibEvents.slice(0, 10).map((evt) => (
                        <li key={evt.id} className="p-5 hover:bg-primary/5 transition-colors">
                            <p className="font-bold text-sm uppercase tracking-wide leading-tight">{evt.title}</p>
                            <p className="text-xs font-bold text-primary mt-2 uppercase tracking-widest">
                                {evt.start ? new Date(evt.start).toLocaleDateString() : 'TBD'}
                            </p>
                        </li>
                    ))}
                    {auibEvents.length === 0 && (
                        <li className="p-6 text-sm font-bold uppercase tracking-widest text-center text-foreground/70">No events found or failed to load.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>

      {/* Brutalist Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-card text-foreground p-8 md:p-12 border-4 border-border shadow-[16px_16px_0px_0px_var(--primary)] max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">

                <button onClick={handleCloseModal} aria-label="Close modal" className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors">
                    <X size={32} strokeWidth={3} />
                </button>

                <h3 className="text-3xl font-bold mb-8 uppercase tracking-widest border-b-4 border-border pb-4 pr-12">Create New Event</h3>

                {errorMessage && (
                  <div className="mb-8 p-4 border-4 border-red-500 bg-background text-red-500 text-sm font-bold flex items-center gap-3">
                    <AlertTriangle size={20} className="flex-shrink-0" />
                    <span className="break-words">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleCreateEvent} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="titleEn" className="block text-sm font-bold uppercase tracking-wide">Title (EN) <span className="text-primary">*</span></label>
                            <input id="titleEn" required type="text" value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-bold text-lg text-foreground" />
                        </div>
                        <div className="space-y-3" dir="rtl">
                            <label htmlFor="titleAr" className="block text-sm font-bold uppercase tracking-wide text-right">Title (AR) <span className="text-primary">*</span></label>
                            <input id="titleAr" required type="text" value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-bold text-lg text-foreground" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="descEn" className="block text-sm font-bold uppercase tracking-wide">Description (EN) <span className="text-primary">*</span></label>
                            <textarea id="descEn" required value={descEn} onChange={e=>setDescEn(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none h-32 font-medium leading-relaxed resize-none text-foreground" />
                        </div>
                        <div className="space-y-3" dir="rtl">
                            <label htmlFor="descAr" className="block text-sm font-bold uppercase tracking-wide text-right">Description (AR) <span className="text-primary">*</span></label>
                            <textarea id="descAr" required value={descAr} onChange={e=>setDescAr(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none h-32 font-medium leading-relaxed resize-none text-foreground" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label htmlFor="location" className="block text-sm font-bold uppercase tracking-wide">Location <span className="text-primary">*</span></label>
                        <input id="location" required type="text" value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-bold text-foreground" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label htmlFor="startsAt" className="block text-sm font-bold uppercase tracking-wide">Starts At <span className="text-primary">*</span></label>
                            {/* The color-scheme CSS forces the native browser calendar picker to obey dark mode */}
                            <input id="startsAt" required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-bold text-sm text-foreground [color-scheme:light_dark]" />
                        </div>
                        <div className="space-y-3">
                            <label htmlFor="endsAt" className="block text-sm font-bold uppercase tracking-wide">Ends At <span className="text-primary">*</span></label>
                            <input id="endsAt" required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="w-full p-4 border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary rounded-none font-bold text-sm text-foreground [color-scheme:light_dark]" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-8 pt-8 border-t-4 border-border">
                        <input type="checkbox" id="membersOnly" checked={isMembersOnly} onChange={e=>setIsMembersOnly(e.target.checked)} className="w-6 h-6 text-primary border-2 border-border rounded-none focus:ring-primary focus:ring-offset-0 bg-background" />
                        <label htmlFor="membersOnly" className="text-lg font-bold uppercase tracking-wider text-foreground cursor-pointer">Members Only Event</label>
                    </div>

                    <div className="flex justify-end gap-6 mt-12">
                        <button type="button" onClick={handleCloseModal} className="px-8 py-4 border-4 border-border text-foreground font-bold uppercase tracking-widest hover:bg-foreground hover:text-background transition-colors shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:shadow-none hover:translate-y-1 hover:translate-x-1">
                            Cancel
                        </button>
                        <button type="submit" className="px-8 py-4 bg-primary text-background font-bold uppercase tracking-widest border-4 border-border shadow-[6px_6px_0px_0px_var(--brutalist-shadow)] hover:bg-foreground transition-colors hover:shadow-none hover:translate-y-1 hover:translate-x-1">
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
