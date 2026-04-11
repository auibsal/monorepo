import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      
      {/* Arabic Official Title using the Arabic font variable */}
      <h2 className="text-2xl md:text-3xl font-medium tracking-wide mb-2 opacity-80" style={{ fontFamily: 'var(--font-ibm-plex-arabic)' }}>
        الاتحاد العراقي للدومنة
      </h2>

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

      <div className="flex flex-col sm:flex-row gap-4">
        <Link 
          href="/register" 
          className="px-8 py-4 bg-federation-ivory text-federation-obsidian font-semibold rounded-sm hover:opacity-90 transition-opacity duration-200"
        >
          Claim Your Player ID
        </Link>
        
        <Link 
          href="/rules" 
          className="px-8 py-4 border border-federation-ivory text-federation-ivory font-semibold rounded-sm hover:bg-federation-ivory hover:text-federation-obsidian transition-colors duration-200"
        >
          Official Rulebook
        </Link>
      </div>
    </div>
  )
}
