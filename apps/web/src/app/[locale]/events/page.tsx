import { useTranslations } from 'next-intl';

export default function Events() {
  const t = useTranslations('EventsPage');

  const upcomingEvents = [
    {
      id: 1,
      date: t('event1Date'),
      title: t('event1Title'),
      location: t('event1Location'),
      description: t('event1Desc')
    },
    {
      id: 2,
      date: t('event2Date'),
      title: t('event2Title'),
      location: t('event2Location'),
      description: t('event2Desc')
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <header className="mb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-auib-red mb-4">
          {t('pageTitle')}
        </h1>
        <p className="text-lg text-auib-charcoal/70 max-w-2xl mx-auto">
          {t('pageSubtitle')}
        </p>
      </header>

      <div className="space-y-8">
        {upcomingEvents.map((event) => (
          <article 
            key={event.id} 
            className="flex flex-col md:flex-row bg-white border border-auib-charcoal/10 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="md:w-1/3 bg-auib-charcoal/5 p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-auib-charcoal/10">
              <span className="text-auib-red font-bold text-xl mb-2">{event.date}</span>
              <span className="text-sm font-medium text-auib-charcoal uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {event.location}
              </span>
            </div>
            <div className="md:w-2/3 p-8 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-3 group-hover:text-auib-red transition-colors">{event.title}</h2>
              <p className="text-lg leading-relaxed text-auib-charcoal/80">{event.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
