import { createClient } from '@repo/supabase/server';
import { Plus } from 'lucide-react';
import Image from 'next/image';

export default async function ArtworksManager() {
  const supabase = createClient();
  const { data: artworks } = await supabase.from('artworks').select('*').order('created_at', { ascending: false });

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-light">Digital Museum Assets</h2>
        <button className="bg-amber-500 text-zinc-950 px-4 py-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-400">
          <Plus size={16} /> Upload Asset
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950 text-zinc-500 uppercase tracking-widest text-xs border-b border-zinc-800">
            <tr>
              <th className="p-4 font-medium">Artwork</th>
              <th className="p-4 font-medium">Artist</th>
              <th className="p-4 font-medium">3D Coordinates</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {artworks?.map((art) => (
              <tr key={art.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 relative bg-zinc-950 border border-zinc-800">
                    <Image src={art.image_url} alt={art.title} fill className="object-cover" />
                  </div>
                  <span className="font-medium text-zinc-200">{art.title}</span>
                </td>
                <td className="p-4 text-zinc-400">{art.artist}</td>
                <td className="p-4 text-zinc-500 font-mono text-xs">
                  [{art.position_x}, {art.position_y}, {art.position_z}]
                </td>
                <td className="p-4 text-right">
                  <button className="text-amber-500 hover:text-amber-400 text-xs uppercase tracking-wider">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
