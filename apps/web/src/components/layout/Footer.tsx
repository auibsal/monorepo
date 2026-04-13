import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black/50 border-t border-federation-ivory/10 pt-20 pb-10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        
        {/* Brand Column */}
        <div className="col-span-1 md:col-span-2">
          <h2 className="text-2xl font-bold uppercase tracking-widest mb-2">Iraqi Dominoes Federation</h2>
          <p className="text-sm font-medium tracking-wide opacity-80 mb-6" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
            الاتحاد العراقي للدومينو
          </p>
          <p className="text-federation-ivory/60 font-light max-w-sm leading-relaxed mb-6">
            The official governing body standardizing competitive dominoes across Iraq through technological integration and a mathematical rating system.
          </p>
          <div className="flex gap-4">
            <span className="px-3 py-1 border border-federation-ivory/20 text-xs uppercase tracking-widest rounded-sm opacity-50">MoYS Sanctioned</span>
            <span className="px-3 py-1 border border-federation-ivory/20 text-xs uppercase tracking-widest rounded-sm opacity-50">FID Aligned</span>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-federation-ivory/50 mb-6">Operations</h3>
          <ul className="space-y-4">
            <li><Link href="/rules" className="text-federation-ivory/80 hover:text-white transition-colors">Master Rulebook</Link></li>
            <li><Link href="/affiliates" className="text-federation-ivory/80 hover:text-white transition-colors">Host a Tournament</Link></li>
            <li><Link href="/arbiters" className="text-federation-ivory/80 hover:text-white transition-colors">Arbiter Certification</Link></li>
            <li><Link href="/partners" className="text-federation-ivory/80 hover:text-white transition-colors">Corporate Sponsorships</Link></li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-federation-ivory/50 mb-6">Federation</h3>
          <ul className="space-y-4">
            <li><Link href="/register" className="text-federation-ivory/80 hover:text-white transition-colors">Claim Player ID</Link></li>
            <li><Link href="/leaderboard" className="text-federation-ivory/80 hover:text-white transition-colors">National Leaderboard</Link></li>
            <li><Link href="/contact" className="text-federation-ivory/80 hover:text-white transition-colors">Contact Headquarters</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row justify-between items-center pt-8 border-t border-federation-ivory/10 text-xs uppercase tracking-widest text-federation-ivory/40">
        <p>© {new Date().getFullYear()} Iraqi Dominoes Federation. All rights reserved.</p>
        <p className="mt-4 md:mt-0 font-mono">SYS-VER-1.0.0</p>
      </div>
    </footer>
  );
}
