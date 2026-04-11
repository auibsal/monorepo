import Link from 'next/link';

export default function AffiliatePortal() {
  return (
    <div className="max-w-6xl mx-auto py-16 px-6 lg:px-12 w-full">
      <header className="mb-16 border-b border-federation-ivory/20 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-6">
          Become an Official <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
            Host Venue
          </span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg font-light opacity-80">
          Transform your cafe, club, or venue into a competitive hub. Join the IDF network to host officially sanctioned, mathematically rated tournaments and drive guaranteed foot traffic to your business.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-federation-ivory/5 p-8 border border-federation-ivory/10 rounded-sm">
          <h3 className="text-xl font-bold uppercase mb-3 text-federation-ivory">Guaranteed Traffic</h3>
          <p className="font-light opacity-70">Sanctioned tournaments lock players and spectators into your venue for hours, drastically increasing food and beverage revenue.</p>
        </div>
        <div className="bg-federation-ivory/5 p-8 border border-federation-ivory/10 rounded-sm">
          <h3 className="text-xl font-bold uppercase mb-3 text-federation-ivory">Turnkey Operations</h3>
          <p className="font-light opacity-70">You provide the tables; we provide the digital infrastructure, bracket generation, and the mathematical rating engine.</p>
        </div>
        <div className="bg-federation-ivory/5 p-8 border border-federation-ivory/10 rounded-sm">
          <h3 className="text-xl font-bold uppercase mb-3 text-federation-ivory">National Prestige</h3>
          <p className="font-light opacity-70">Your venue will be listed on the official IDF digital directory, establishing your brand as a pillar of the local sports community.</p>
        </div>
      </div>

      <div className="text-center">
        <Link 
          href="/affiliates/apply" 
          className="px-8 py-4 bg-federation-ivory text-federation-obsidian font-bold uppercase tracking-wider rounded-sm hover:opacity-90 transition-opacity inline-block"
        >
          Apply for Affiliate License
        </Link>
      </div>
    </div>
  );
}
