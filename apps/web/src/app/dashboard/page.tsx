export default function PlayerDashboard() {
  // In a real app, you would fetch this data securely via Supabase Auth & SQL
  const mockPlayerData = {
    ida_id: "IDA-001042",
    name: "Ahmed Al-Fadhli",
    rating: 1642.50,
    rank: "National Master",
    winRate: 62.5,
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 w-full">
      <header className="mb-10">
        <h1 className="text-3xl font-bold uppercase tracking-tight">Player Profile</h1>
        <p className="text-federation-ivory/60 font-light mt-1">Official Federation Record</p>
      </header>

      {/* ID Card / Stat Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* The Digital ID Card */}
        <div className="col-span-1 bg-federation-ivory/5 border border-federation-ivory/10 p-8 rounded-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            {/* Background decorative element (could be a domino icon) */}
            <span className="text-6xl font-bold">🁫</span>
          </div>
          <p className="text-sm uppercase tracking-widest text-federation-ivory/60 mb-1">Federation ID</p>
          <h2 className="text-3xl font-mono font-semibold text-white mb-6">{mockPlayerData.ida_id}</h2>
          
          <p className="text-sm uppercase tracking-widest text-federation-ivory/60 mb-1">Player Name</p>
          <h3 className="text-xl font-medium">{mockPlayerData.name}</h3>
        </div>

        {/* The Rating Card */}
        <div className="col-span-1 md:col-span-2 bg-federation-obsidian border border-federation-ivory/20 p-8 rounded-sm flex flex-col justify-center">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-federation-ivory/60 mb-2">Current ELO Rating</p>
              <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-federation-ivory to-gray-400">
                {mockPlayerData.rating.toFixed(0)}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-sm uppercase tracking-widest text-federation-ivory/60 mb-1">Division</p>
              <h3 className="text-lg font-medium text-red-500">{mockPlayerData.rank}</h3>
            </div>
          </div>
          
          {/* Progress bar representing progress to next rank tier */}
          <div className="w-full bg-federation-ivory/10 h-2 mt-4 rounded-full overflow-hidden">
            <div className="bg-red-700 h-full w-[70%]"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
