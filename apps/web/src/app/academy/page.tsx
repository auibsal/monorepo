import Link from 'next/link';
import { PlayCircle, Brain, Target, Award, ChevronRight, Lock } from 'lucide-react';

export default function AcademyDashboardPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-federation-ivory font-sans selection:bg-red-500/30">
      
      {/* Official Header */}
      <header className="border-b border-federation-ivory/10 bg-black sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-federation-ivory text-black flex items-center justify-center font-bold text-2xl uppercase tracking-tighter">
              IDF
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-widest leading-none text-white">Academy</h1>
              <h1 className="text-sm font-mono opacity-60 uppercase tracking-widest leading-none mt-1">Interactive Training Hub</h1>
            </div>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest text-federation-ivory/60">
            <Link href="/arena" className="hover:text-white transition-colors">Play Arena</Link>
            <Link href="/academy" className="text-white border-b-2 border-red-500 pb-1">Academy</Link>
            <div className="flex items-center gap-2 text-red-400">
              <Award size={16} />
              <span>Elo: 1420</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12 flex flex-col lg:flex-row gap-12">
        
        {/* Left Sidebar: Navigation & Stats */}
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
          
          <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-federation-ivory/40 mb-4">Your Curriculum</h3>
            <ul className="space-y-3 font-mono text-sm opacity-90">
              <li>
                <Link href="/academy/courses" className="flex items-center gap-3 text-white hover:text-red-400 transition-colors">
                  <PlayCircle size={16} /> Masterclasses
                </Link>
              </li>
              <li>
                <Link href="/academy/tactics" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Target size={16} /> Tactics & Puzzles
                </Link>
              </li>
              <li>
                <Link href="/academy/vision" className="flex items-center gap-3 hover:text-white transition-colors">
                  <Brain size={16} /> Vision Training
                </Link>
              </li>
            </ul>
          </div>

          <div className="bg-red-900/10 border border-red-500/20 p-6 rounded-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4">Performance Tracker</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Tactics Rating</span>
                  <span className="text-red-400">1850</span>
                </div>
                <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[75%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span>Pip Counting Accuracy</span>
                  <span className="text-white">92%</span>
                </div>
                <div className="w-full h-1 bg-black rounded-full overflow-hidden">
                  <div className="h-full bg-federation-ivory w-[92%]" />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Core Content Area */}
        <div className="flex-1 space-y-12">
          
          {/* Hero: Active Masterclass (YouTube Integration) */}
          <section className="relative w-full aspect-video bg-black border border-white/20 rounded-xl overflow-hidden group">
            {/* In production, replace this overlay with your actual YouTube iframe embed 
              hooked into the playlist ID you provided.
            */}
            <img 
              src="https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=2000&auto=format&fit=crop" 
              alt="Dominoes Masterclass" 
              className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-12">
              <div className="flex items-center gap-3 text-red-500 font-mono text-sm font-bold mb-4">
                <PlayCircle size={18} />
                <span>RESUME PLAYLIST</span>
              </div>
              <h2 className="text-4xl font-bold uppercase tracking-tight mb-2">The Art of the Void Matrix</h2>
              <p className="text-lg opacity-80 font-serif max-w-2xl mb-8">
                Episode 4: How to mathematically deduce your opponent's missing suits based on early-game passing patterns and forced plays.
              </p>
              <button className="bg-federation-ivory text-black font-bold uppercase tracking-widest px-8 py-4 w-max hover:bg-white transition-colors">
                Continue Lesson
              </button>
            </div>
          </section>

          {/* Training Modules Grid */}
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold uppercase tracking-widest">Training Modules</h2>
              <Link href="/academy/courses" className="text-sm font-mono text-federation-ivory/50 hover:text-white flex items-center">
                View All <ChevronRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Module 1 */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-lg hover:border-red-500/50 transition-all cursor-pointer group">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-500/20 group-hover:text-red-400 transition-colors">
                  <Target size={20} />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Daily Tactics</h3>
                <p className="text-sm opacity-60 font-serif mb-4">
                  Solve 5 engine-evaluated positions. Find the optimal move to secure a lock or force a pass.
                </p>
                <div className="flex items-center justify-between text-xs font-mono border-t border-white/10 pt-4 mt-auto">
                  <span className="text-red-400">Streak: 12 Days</span>
                  <span className="bg-white/10 px-2 py-1 rounded">Solve Now</span>
                </div>
              </div>

              {/* Module 2 */}
              <div className="bg-white/5 border border-white/10 p-6 rounded-lg hover:border-federation-ivory/50 transition-all cursor-pointer group">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-white transition-colors group-hover:text-black">
                  <Brain size={20} />
                </div>
                <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Pip Counting Drills</h3>
                <p className="text-sm opacity-60 font-serif mb-4">
                  Flashcard-style vision training. Calculate the total weight of the board in under 3 seconds.
                </p>
                <div className="flex items-center justify-between text-xs font-mono border-t border-white/10 pt-4 mt-auto">
                  <span className="opacity-50">High Score: 42</span>
                  <span className="bg-white/10 px-2 py-1 rounded">Start Drill</span>
                </div>
              </div>

              {/* Module 3 (Locked Premium) */}
              <div className="bg-black border border-white/5 p-6 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 font-mono text-sm backdrop-blur-md border border-white/20">
                    <Lock size={14} /> Pro Required
                  </div>
                </div>
                <div className="opacity-40">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <Award size={20} />
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-widest mb-2">Endgame Masterclass</h3>
                  <p className="text-sm opacity-60 font-serif mb-4">
                    Advanced calculus for forcing draws (Block/Lock) when trailing in pip count.
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono border-t border-white/10 pt-4 mt-auto">
                    <span>12 Lessons</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Interactive Component Blueprint: The Tactics Board */}
          <section className="bg-[#0f0f0f] border border-white/10 rounded-xl p-8 flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl font-bold uppercase tracking-tight">The Oracle's Challenge</h2>
              <p className="text-lg opacity-80 font-serif">
                The IS-MCTS Engine has analyzed millions of games. It has identified a critical blunder made by Player 2 in this exact position. Can you find the correct move?
              </p>
              <ul className="space-y-2 text-sm font-mono opacity-60 list-disc list-inside mb-6">
                <li>Opponent holds 4 tiles.</li>
                <li>Your partner passed on 5s.</li>
                <li>Board ends are [5] and [2].</li>
              </ul>
              <button className="bg-red-600 text-white font-bold uppercase tracking-widest px-6 py-3 hover:bg-red-500 transition-colors">
                Analyze Position
              </button>
            </div>
            
            {/* Visual representation of the puzzle board */}
            <div className="w-full md:w-1/2 aspect-square bg-black border border-white/10 rounded-lg shadow-2xl relative flex items-center justify-center">
               <div className="absolute top-4 left-4 text-xs font-mono text-red-500 bg-red-500/10 px-3 py-1 rounded-sm border border-red-500/20">
                 White to play and Lock
               </div>
               {/* Mock Domino Representation */}
               <div className="flex gap-1 shadow-2xl rotate-12 scale-125">
                 <div className="w-12 h-24 bg-federation-ivory rounded-md border border-black flex flex-col justify-between p-2">
                    <span className="text-black font-bold text-center">5</span>
                    <div className="h-[2px] w-full bg-black/20" />
                    <span className="text-black font-bold text-center">5</span>
                 </div>
                 <div className="w-12 h-24 bg-federation-ivory rounded-md border border-black flex flex-col justify-between p-2">
                    <span className="text-black font-bold text-center">5</span>
                    <div className="h-[2px] w-full bg-black/20" />
                    <span className="text-black font-bold text-center">2</span>
                 </div>
               </div>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
