'use client';

import { DndContext, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { useGameStore } from '@/store/useGameStore';
import { DominoTile } from './DominoTile';

// A drop zone component for the left and right ends of the board
const DropZone = ({ id, currentEnd }: { id: string, currentEnd: number | null }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-colors duration-300 ${
        isOver ? 'border-red-500 bg-red-500/10' : 'border-dashed border-federation-ivory/20'
      }`}
    >
      <span className="text-federation-ivory/50 font-mono text-sm">
        {currentEnd !== null ? `END: ${currentEnd}` : 'START'}
      </span>
    </div>
  );
};

export const GameTable = () => {
  const { playerHand, boardTiles, openEnds, playTile } = useGameStore();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const tileData = active.data.current;
    if (!tileData) return;

    const dropZoneId = over.id.toString(); // 'zone-left' or 'zone-right'
    const targetEnd = dropZoneId === 'zone-left' ? 0 : 1;
    const endValue = openEnds[targetEnd];

    // Check if it's the first move, or if the tile matches the open end
    if (
      endValue === null || 
      tileData.high === endValue || 
      tileData.low === endValue
    ) {
      playTile(active.id.toString(), dropZoneId === 'zone-left' ? 'left' : 'right');
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="w-full flex flex-col gap-12 pt-12">
        
        {/* THE TABLE */}
        <div className="relative w-full h-[400px] bg-federation-obsidian border border-federation-ivory/10 shadow-2xl rounded-lg flex items-center justify-between px-12">
          <DropZone id="zone-left" currentEnd={openEnds[0]} />
          
          <div className="flex gap-2">
            {boardTiles.map(tile => (
              <DominoTile key={`board-${tile.id}`} id={`board-${tile.id}`} high={tile.high} low={tile.low} isDraggable={false} />
            ))}
          </div>

          <DropZone id="zone-right" currentEnd={openEnds[1]} />
        </div>

        {/* THE PLAYER'S HAND */}
        <div className="flex justify-center gap-4 p-8 bg-federation-ivory/5 border-t border-federation-ivory/10 rounded-b-lg">
          {playerHand.map((tile) => (
            <DominoTile key={tile.id} id={tile.id} high={tile.high} low={tile.low} />
          ))}
        </div>

      </div>
    </DndContext>
  );
};
