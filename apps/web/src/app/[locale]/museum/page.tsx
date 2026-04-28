'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Image as DreiImage, Text } from '@react-three/drei';
import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@repo/supabase/client';
import { Howl } from 'howler';

function Artwork({ art }: { art: any }) {
  const [hovered, setHover] = useState(false);
  
  const playAudio = () => {
    if (art.audio_url) {
      const sound = new Howl({ src: [art.audio_url], html5: true, volume: 0.5 });
      sound.play();
    }
  };

  const handlePointerOver = () => {
    setHover(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHover(false);
    document.body.style.cursor = 'auto';
  };

  return (
    <group 
      position={[art.position_x, art.position_y, art.position_z]} 
      onPointerOver={handlePointerOver} 
      onPointerOut={handlePointerOut}
      onClick={playAudio}
    >
      <DreiImage 
        url={art.image_url} 
        scale={hovered ? [3.2, 3.2, 1] : [3, 3, 1]} 
        transparent 
        opacity={hovered ? 1 : 0.9}
      />
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[3.3, 3.3, 0.1]} />
        <meshStandardMaterial color={hovered ? "#f59e0b" : "#18181b"} />
      </mesh>
      
      {hovered && (
        <Text
          position={[0, -2, 0.1]}
          fontSize={0.2}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
        >
          {art.title.toUpperCase()}
        </Text>
      )}
    </group>
  );
}

export default function Museum() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchArt() {
      const { data } = await supabase.from('artworks').select('*');
      if (data) setArtworks(data);
    }
    fetchArt();
  }, []);

  return (
    <div className="w-full h-screen bg-zinc-950 overflow-hidden relative">
      <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-amber-500 uppercase tracking-widest text-xs">Loading Exhibition...</div>}>
        <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
          <ambientLight intensity={0.3} />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2} color="#f59e0b" />
          
          <group position={[0, 0, 0]}>
            {artworks.map((art) => (
              <Artwork key={art.id} art={art} />
            ))}
          </group>

          <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            maxDistance={25} 
            minDistance={5}
            dampingFactor={0.05}
          />
          <Environment preset="night" />
        </Canvas>
      </Suspense>
      
      <div className="absolute bottom-10 left-10 pointer-events-none">
        <p className="text-zinc-500 text-xs tracking-[0.2em] uppercase">Exhibition 01</p>
        <p className="text-zinc-300 text-sm tracking-widest uppercase mt-1">Contemporary Archive</p>
      </div>
    </div>
  );
}
