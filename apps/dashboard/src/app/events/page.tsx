import ical from 'node-ical';

export const revalidate = 3600; // revalidate every hour

async function getAUIBEvents() {
  try {
    const events = await ical.async.fromURL('https://auib.edu.iq/?post_type=tribe_events&ical=1&eventDisplay=list');
    return Object.values(events).filter((event) => event && event.type === 'VEVENT');
  } catch (error) {
    console.error('Failed to fetch AUIB calendar:', error);
    return [];
  }
}

export default async function EventsPage() {
  const auibEvents = await getAUIBEvents();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Events Management</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">New Event</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
            <h3 className="text-lg font-medium mb-4">Society Events</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">Event</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 text-sm font-medium text-gray-500">Members Only</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {/* Placeholder */}
                    <tr>
                        <td className="px-6 py-4 text-sm" colSpan={3}>No upcoming society events.</td>
                    </tr>
                </tbody>
                </table>
            </div>
        </div>

        <div>
            <h3 className="text-lg font-medium mb-4 text-red-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Official AUIB Academic Calendar Overlay
            </h3>
            <p className="text-sm text-gray-500 mb-4">Check for conflicts before scheduling.</p>
            <div className="bg-white rounded-lg border border-red-200 overflow-hidden max-h-[600px] overflow-y-auto">
                <ul className="divide-y divide-gray-100">
                    {auibEvents.slice(0, 10).map((event: any /* eslint-disable-line @typescript-eslint/no-explicit-any */, i) => (
                        <li key={i} className="p-4 hover:bg-gray-50">
                            <p className="font-medium text-sm">{event.summary}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {event.start ? new Date(event.start).toLocaleDateString() : 'TBD'}
                            </p>
                        </li>
                    ))}
                    {auibEvents.length === 0 && (
                        <li className="p-4 text-sm text-gray-500">No events found or failed to load.</li>
                    )}
                </ul>
            </div>
        </div>
      </div>
    </div>
  );
}
