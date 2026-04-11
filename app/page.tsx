import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      
      {/* Arabic Official Title */}
      <h2 className="text-2xl md:text-3xl font-medium tracking-wide mb-2 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
        الاتحاد العراقي للدومينو
      </h2>

      {/* English Title */}
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 uppercase">
        Iraqi Dominoes <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-500">
          Federation
        </span>
      </h1>

      <p className="max-w-2xl text-lg md:text-xl font-light opacity-80 mb-10">
        The official governing body for competitive dominoes in Iraq. 
        Compete in sanctioned tournaments, track your match history, and climb the national mathematical ranking system.
      </p>

      {/* Call to Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Primary Action */}
        <Link 
          href="/register" 
          className="px-8 py-4 bg-federation-ivory text-federation-obsidian font-semibold rounded-sm hover:bg-white transition-colors duration-200"
        >
          Claim Your Player ID
        </Link>
        
        {/* Secondary Action */}
        <Link 
          href="/rules" 
          className="px-8 py-4 border border-federation-ivory text-federation-ivory font-semibold rounded-sm hover:bg-federation-ivory hover:text-federation-obsidian transition-colors duration-200"
        >
          Official Rulebook
        </Link>
      </div>

      {/* Trust Indicators / Stats */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-3xl border-t border-federation-ivory/20 pt-8">
        <div>
          <h3 className="text-3xl font-bold">Mathematical</h3>
          <p className="text-sm opacity-70 uppercase tracking-widest mt-1">Rating System</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold">MoYS</h3>
          <p className="text-sm opacity-70 uppercase tracking-widest mt-1">Sanctioned Framework</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold">FID</h3>
          <p className="text-sm opacity-70 uppercase tracking-widest mt-1">Global Alignment</p>
        </div>
      </div>
    </div>
  )
}
