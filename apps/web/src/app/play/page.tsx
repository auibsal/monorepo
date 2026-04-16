import LobbyButton from '../components/LobbyButton';

export default function Home() {
    return (
        <main className="flex h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-mono relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-500 to-zinc-950"></div>
            
            <div className="z-10 flex flex-col items-center text-center">
                <h1 className="text-5xl font-bold mb-4 tracking-widest uppercase text-white shadow-zinc-900 drop-shadow-lg">
                    Federation Dominoes
                </h1>
                <p className="text-zinc-400 mb-12 tracking-wider max-w-md">
                    Official 2v2 Competitive Arena.
                </p>
                
                {/* The matchmaking button we built */}
                <LobbyButton />
            </div>
        </main>
    );
}
