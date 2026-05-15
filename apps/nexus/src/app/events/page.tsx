'use client';

import { useState, useEffect } from 'react';
import { createClient } from 'auth/client';
import { Event } from 'database';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
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
           setAuibEvents(data);
       }
     } catch(e) {
       console.error("Failed to fetch auib events proxy", e);
     }
  }

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
      cover_image_url: '', // Defaulting to empty
    });

    if (error) {
      alert('Error creating event: ' + error.message);
    } else {
      setShowModal(false);
      setTitleEn(''); setTitleAr(''); setDescEn(''); setDescAr('');
      setLocation(''); setStartsAt(''); setEndsAt(''); setIsMembersOnly(false);
      fetchEvents();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-widest text-auib-white">Events Management</h2>
        <button
            onClick={() => setShowModal(true)}
            className="bg-auib-red text-auib-white font-bold uppercase tracking-wider px-4 py-2 border-2 border-auib-red hover:bg-auib-white hover:text-auib-red transition-colors shadow-[4px_4px_0px_0px_#273237]">
            New Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
            <h3 className="text-lg font-bold uppercase tracking-wide text-auib-white mb-4 border-b-2 border-auib-white pb-2">Society Events</h3>
            <div className="bg-auib-white border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] overflow-hidden text-auib-charcoal">
                <table className="w-full text-left">
                <thead className="bg-auib-charcoal text-auib-white border-b-2 border-auib-charcoal">
                    <tr>
                    <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Event</th>
                    <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Date</th>
                    <th className="px-6 py-3 text-sm font-bold uppercase tracking-wide">Members Only</th>
                    </tr>
                </thead>
                <tbody className="divide-y-2 divide-auib-charcoal/20">
                    {loading ? (
                        <tr>
                            <td className="px-6 py-4 text-sm font-mono" colSpan={3}>Loading events...</td>
                        </tr>
                    ) : events.length === 0 ? (
                        <tr>
                            <td className="px-6 py-4 text-sm font-mono" colSpan={3}>No upcoming society events.</td>
                        </tr>
                    ) : events.map(event => (
                         <tr key={event.id}>
                            <td className="px-6 py-4 text-sm font-bold">{event.title_en}</td>
                            <td className="px-6 py-4 text-sm font-mono text-auib-charcoal/70">{new Date(event.starts_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-sm font-mono">
                                {event.is_members_only ? (
                                    <span className="bg-auib-red text-white px-2 py-0.5 uppercase text-xs tracking-wider">Yes</span>
                                ) : (
                                    <span className="bg-auib-charcoal/20 text-auib-charcoal px-2 py-0.5 uppercase text-xs tracking-wider">No</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
                </table>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-bold uppercase tracking-wide mb-4 text-auib-red flex items-center gap-2 border-b-2 border-auib-red pb-2">
                <span className="w-3 h-3 bg-auib-red shadow-[2px_2px_0px_0px_#273237]"></span>
                Official AUIB Academic Calendar Overlay
            </h3>
            <p className="text-sm font-mono text-auib-white/80 mb-4">Check for conflicts before scheduling.</p>
            <div className="bg-auib-white text-auib-charcoal border-2 border-auib-red shadow-[8px_8px_0px_0px_#9C213E] overflow-hidden max-h-[600px] overflow-y-auto">
                <ul className="divide-y-2 divide-auib-charcoal/10">
                    {auibEvents.slice(0, 10).map((event, i) => {
                        const evt = event as { summary?: string; start?: string | Date };
                        return (
                        <li key={i} className="p-4 hover:bg-gray-50 transition-colors">
                            <p className="font-bold text-sm uppercase">{evt.summary}</p>
                            <p className="text-xs font-mono text-auib-charcoal/70 mt-1">
                                {evt.start ? new Date(evt.start).toLocaleDateString() : 'TBD'}
                            </p>
                        </li>
                    )})}
                    {auibEvents.length === 0 && (
                        <li className="p-4 text-sm font-mono text-auib-charcoal/70">No events found or failed to load.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-auib-charcoal/80 flex items-center justify-center z-50 p-4">
            <div className="bg-auib-white text-auib-charcoal p-8 border-2 border-auib-charcoal shadow-[8px_8px_0px_0px_#273237] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-2xl font-bold mb-6 uppercase tracking-widest border-b-2 border-auib-charcoal pb-2">Create New Event</h3>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold uppercase tracking-wide">Title (EN)</label>
                            <input required type="text" value={titleEn} onChange={e=>setTitleEn(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none" />
                        </div>
                        <div className="space-y-2" dir="rtl">
                            <label className="block text-sm font-bold uppercase tracking-wide text-left" dir="ltr">Title (AR)</label>
                            <input required type="text" value={titleAr} onChange={e=>setTitleAr(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold uppercase tracking-wide">Description (EN)</label>
                            <textarea required value={descEn} onChange={e=>setDescEn(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none h-24" />
                        </div>
                        <div className="space-y-2" dir="rtl">
                            <label className="block text-sm font-bold uppercase tracking-wide text-left" dir="ltr">Description (AR)</label>
                            <textarea required value={descAr} onChange={e=>setDescAr(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none h-24" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-bold uppercase tracking-wide">Location</label>
                        <input required type="text" value={location} onChange={e=>setLocation(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold uppercase tracking-wide">Starts At</label>
                            <input required type="datetime-local" value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-bold uppercase tracking-wide">Ends At</label>
                            <input required type="datetime-local" value={endsAt} onChange={e=>setEndsAt(e.target.value)} className="w-full p-2 border-2 border-auib-charcoal bg-transparent focus:outline-none focus:border-auib-red rounded-none" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t-2 border-auib-charcoal/20">
                        <input type="checkbox" id="membersOnly" checked={isMembersOnly} onChange={e=>setIsMembersOnly(e.target.checked)} className="w-4 h-4 text-auib-red border-auib-charcoal rounded-none focus:ring-auib-red" />
                        <label htmlFor="membersOnly" className="text-sm font-bold uppercase tracking-wide">Members Only Event</label>
                    </div>

                    <div className="flex justify-end gap-4 mt-8">
                        <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border-2 border-auib-charcoal text-auib-charcoal font-bold uppercase tracking-widest hover:bg-auib-charcoal hover:text-auib-white transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-auib-red text-auib-white font-bold uppercase tracking-widest border-2 border-auib-red shadow-[4px_4px_0px_0px_#273237] hover:bg-auib-charcoal hover:border-auib-charcoal transition-colors">Create Event</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
