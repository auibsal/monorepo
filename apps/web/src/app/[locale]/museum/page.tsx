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
    document.body.style.cursor = 'pointer'; // Changes the cursor
  };

  const handlePointerOut = () => {
    setHover(false);
    document.body.style.cursor = 'auto'; // Resets the cursor
  };

  return (
    <group 
      position={[art.position_x, art.position_y, art.position_z]} 
      onPointerOver={handlePointerOver} 
      onPointerOut={handlePointerOut}
      onClick={playAudio}
      // className="cursor-pointer" <--- THIS IS REMOVED
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
