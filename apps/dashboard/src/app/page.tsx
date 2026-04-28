import { createClient } from '@repo/supabase/server';

export default async function DashboardOverview() {
  const supabase = createClient();
  
  const [ { count: artworksCount }, { count: postsCount } ] = await Promise.all([
    supabase.from('artworks').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true })
  ]);

  return (
    <div className="p-10">
      <header className="mb-8">
        <h2 className="text-2xl font-light">System Overview</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border border-zinc-800 bg-zinc-900/20">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Total Artworks</p>
          <p className="text-4xl font-light text-amber-500">{artworksCount || 0}</p>
        </div>
        <div className="p-6 border border-zinc-800 bg-zinc-900/20">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Published Posts</p>
          <p className="text-4xl font-light text-amber-500">{postsCount || 0}</p>
        </div>
      </div>
    </div>
  );
}
