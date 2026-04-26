import { Link } from '@/i18n/routing';

export default function SponsorsDeck() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6 lg:px-12 w-full">
      <header className="text-center mb-20">
        <h2 className="text-xl font-medium tracking-widest uppercase opacity-60 mb-4">Corporate Integration</h2>
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight">
          Partner with the IDA
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
        <div className="border-t-4 border-red-700 pt-6">
          <h3 className="text-2xl font-bold uppercase mb-4">Digital Real Estate</h3>
          <p className="font-light opacity-80 leading-relaxed">
            Integrate your brand directly into the digital ecosystem. With thousands of players checking their ELO ratings and live brackets daily, your corporate identity will be placed on high-traffic, high-engagement dashboard screens, not just physical banners.
          </p>
        </div>
        <div className="border-t-4 border-association-white pt-6">
          <h3 className="text-2xl font-bold uppercase mb-4">Title Sponsorships</h3>
          <p className="font-light opacity-80 leading-relaxed">
            Own the competitive narrative. Secure naming rights for Tier 1 National Championships or specific regional divisions. Align your brand with the pursuit of strategic excellence and technological modernization in Iraqi sports.
          </p>
        </div>
      </div>

      <div className="bg-black/5 border border-black/20 p-12 text-center rounded-sm">
        <h3 className="text-3xl font-bold uppercase mb-6">Request the Pitch Deck</h3>
        <p className="font-light opacity-80 max-w-2xl mx-auto mb-8">
          Contact the Executive Board to receive our comprehensive commercial dossier, detailing user demographics, engagement metrics, and exclusive partnership tiers.
        </p>
        <a 
          href="mailto:commercial@ida.iq"
          className="px-8 py-4 bg-association-white text-association-black font-bold uppercase tracking-wider rounded-sm hover:bg-white transition-colors inline-block"
        >
          Contact Commercial Department
        </a>
      </div>
    </div>
  );
}
