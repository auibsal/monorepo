import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export const Footer = () => {
  const t = useTranslations('Footer');
  return (
    <footer className="bg-[#020202] border-t border-white/10 text-white font-mono relative overflow-hidden z-20">
      
      {/* Background Architectural Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-20">
          
          {/* THE ASSOCIATION */}
          <div className="col-span-1 md:col-span-5 pr-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-8 bg-white text-black flex flex-col justify-between p-1 rounded-sm border border-gray-400">
                <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="w-full h-[1px] bg-gray-400"></div>
                <div className="w-1.5 h-1.5 bg-black rounded-full self-end"></div>
              </div>
              <h2 className="text-white text-2xl font-black tracking-tighter uppercase">{t('title')}</h2>
            </div>
            <p className="text-white/40 leading-relaxed normal-case text-sm tracking-normal font-sans border-l border-white/10 pl-4">
              {t('description')}
            </p>
          </div>

          {/* COLUMNS */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
            <h3 className="text-white/30 text-xs tracking-[0.2em] mb-2 uppercase">{t('registry')}</h3>
            <h3 className="text-white/30 text-xs tracking-[0.2em] mb-2 uppercase">{t('rulebook')}</h3>
            <h3 className="text-white/30 text-xs tracking-[0.2em] mb-2 uppercase">{t('sanctionedPlay')}</h3>
            <Link href="/arena" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">Sanctioned Arenas</Link>
            <Link href="/leaderboard" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">World Rankings</Link>
            <Link href="/tournaments" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">Championships</Link>
          </div>

          <div className="col-span-1 md:col-span-2 flex flex-col gap-5">
            <h3 className="text-white/30 text-xs tracking-[0.2em] mb-2 uppercase">Committees</h3>
            <Link href="/rules" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">Rules & Regulations</Link>
            <Link href="/disputes" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">Match Disputes</Link>
            <Link href="/membership" className="text-sm text-white/60 hover:text-white hover:translate-x-1 transition-all">Club Membership</Link>
          </div>

          <div className="col-span-1 md:col-span-3 flex flex-col gap-5">
            <h3 className="text-white/30 text-xs tracking-[0.2em] mb-2 uppercase">The Engine Oracle</h3>
            <Link href="/dev" className="text-sm text-red-500/80 hover:text-red-500 hover:translate-x-1 transition-all">Access Dev Terminal</Link>
            <p className="text-xs text-white/30 normal-case font-sans mt-2">
              Powered by IS-MCTS and Rust WebAssembly.
            </p>
          </div>

        </div>

        {/* BOTTOM FEDERATION STAMP */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-t border-white/10 pt-10">
          <div className="text-white/30 text-xs uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} I.D.A.<br/>
            BAGHDAD, IRAQ. ALL RIGHTS RESERVED.
          </div>
          
          <div className="flex items-center gap-4 bg-black border border-white/10 px-6 py-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            <span className="text-white/50 text-[10px] tracking-[0.3em]">FEDERATION SERVERS: <span className="text-green-500">ONLINE</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};
