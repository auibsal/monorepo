'use client';
import React from 'react';

// Use React.ReactElement[] instead of JSX.Element[]
const PIP_MAP: Record<number, React.ReactElement[]> = {
  0: [],
  1: [<circle key="c" cx="50" cy="50" r="10" />],
  2: [<circle key="1" cx="25" cy="25" r="10" />, <circle key="2" cx="75" cy="75" r="10" />],
  3: [<circle key="1" cx="25" cy="25" r="10" />, <circle key="c" cx="50" cy="50" r="10" />, <circle key="2" cx="75" cy="75" r="10" />],
  4: [<circle key="1" cx="25" cy="25" r="10" />, <circle key="2" cx="75" cy="25" r="10" />, <circle key="3" cx="25" cy="75" r="10" />, <circle key="4" cx="75" cy="75" r="10" />],
  5: [<circle key="1" cx="25" cy="25" r="10" />, <circle key="2" cx="75" cy="25" r="10" />, <circle key="c" cx="50" cy="50" r="10" />, <circle key="3" cx="25" cy="75" r="10" />, <circle key="4" cx="75" cy="75" r="10" />],
  6: [<circle key="1" cx="25" cy="20" r="10" />, <circle key="2" cx="75" cy="20" r="10" />, <circle key="3" cx="25" cy="50" r="10" />, <circle key="4" cx="75" cy="50" r="10" />, <circle key="5" cx="25" cy="80" r="10" />, <circle key="6" cx="75" cy="80" r="10" />],
};

export default function DominoTile({ values, orientation, isReversed }: any) {
  const isDouble = values[0] === values[1];
  const vertical = orientation === 'vertical' || isDouble;

  const Face = ({ val }: { val: number }) => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-zinc-900">
      {PIP_MAP[val]}
    </svg>
  );

  return (
    <div className={`flex border-[1.5px] border-zinc-400 bg-zinc-50 rounded-sm shadow-md ${vertical ? 'flex-col w-10 h-20' : 'flex-row w-20 h-10'} ${isReversed ? (vertical ? 'flex-col-reverse' : 'flex-row-reverse') : ''}`}>
      <div className="flex-1 p-1 border-zinc-300"><Face val={values[0]} /></div>
      <div className={`w-full h-[1px] bg-zinc-300 ${vertical ? '' : 'hidden'}`} />
      <div className={`h-full w-[1px] bg-zinc-300 ${vertical ? 'hidden' : ''}`} />
      <div className="flex-1 p-1"><Face val={values[1]} /></div>
    </div>
  );
}
