import { Link } from '@/i18n/routing';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-association-white text-association-black font-sans flex flex-col justify-center items-center relative overflow-hidden">
      
      {/* Structural Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none z-0"></div>

      {/* Massive 404 Typography */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        
        <h1 className="text-[12rem] md:text-[18rem] font-black tracking-tighter leading-none text-transparent [-webkit-text-stroke:4px_#e5e5e5] relative">
          404
          {/* Floating red accent box mimicking a misplaced domino */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-24 md:w-24 md:h-36 bg-red-600 rotate-12 shadow-2xl mix-blend-multiply flex flex-col justify-between p-3 border-4 border-white">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-full h-[2px] bg-white/50"></div>
            <div className="w-3 h-3 bg-white rounded-full self-end"></div>
          </div>
        </h1>

        <div className="mt-8 bg-white border border-black/10 shadow-xl p-8 max-w-lg relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Invalid Tile Placed</h2>
          <p className="text-black/60 font-mono text-sm leading-relaxed mb-8">
            The requested quadrant does not exist in the Federation registry. The maneuver is invalid. Please return to the sanctioned arena or consult the rulebook.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="bg-white text-white font-mono text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-red-600 transition-colors shadow-[4px_4px_0px_rgba(0,0,0,0.2)]">
              Return to Registry
            </Link>
            <Link href="/arena" className="bg-white border border-black/20 text-black font-mono text-xs font-bold uppercase tracking-widest px-8 py-4 hover:bg-black hover:text-white transition-colors">
              Enter Arena
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
