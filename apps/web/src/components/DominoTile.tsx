'use client';

interface DominoTileProps {
    values: [number, number];
    orientation: 'horizontal' | 'vertical';
    isReversed: boolean; // True if we need to flip it so the matching pip touches the previous tile
}

export default function DominoTile({ values, orientation, isReversed }: DominoTileProps) {
    const isDouble = values[0] === values[1];
    
    // Doubles are always rendered vertically relative to the train line
    const renderVertical = orientation === 'vertical' || isDouble;

    return (
        <div 
            className={`
                flex border-2 border-zinc-400 bg-zinc-100 text-zinc-900 shadow-[4px_4px_0px_#3f3f46]
                ${renderVertical ? 'flex-col w-12 h-24' : 'flex-row w-24 h-12'}
                ${isReversed ? (renderVertical ? 'flex-col-reverse' : 'flex-row-reverse') : ''}
            `}
        >
            <div className={`flex-1 flex items-center justify-center font-bold text-xl ${renderVertical ? 'border-b-2' : 'border-r-2'} border-zinc-900`}>
                {values[0]}
            </div>
            <div className="flex-1 flex items-center justify-center font-bold text-xl">
                {values[1]}
            </div>
        </div>
    );
}
