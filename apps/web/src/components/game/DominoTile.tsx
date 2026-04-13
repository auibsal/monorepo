'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface TileProps {
  id: string;
  high: number;
  low: number;
  isDraggable?: boolean;
}

export const DominoTile = ({ id, high, low, isDraggable = true }: TileProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: !isDraggable,
    data: { high, low }
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative bg-federation-ivory w-12 h-24 rounded-md border-2 border-black/20 shadow-md flex flex-col items-center justify-between py-2 ${
        isDraggable ? 'cursor-grab active:cursor-grabbing hover:-translate-y-2 transition-transform duration-200' : ''
      }`}
    >
      <span className="font-bold text-xl text-federation-obsidian">{high}</span>
      <div className="w-full h-[2px] bg-black/20" />
      <span className="font-bold text-xl text-federation-obsidian">{low}</span>
    </div>
  );
};
