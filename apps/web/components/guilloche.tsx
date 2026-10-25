// biome-ignore-all lint/suspicious/noBitwiseOperators: a seeded generator works in 32-bit integers
/**
 * The line pattern on cards and certificates: a guilloche rosette drawn
 * from the card number (or a certificate's serial), so no two share one.
 * The check pages draw the same rosette, so anyone checking can compare. Hairlines in the line color, like the engraved
 * patterns on banknotes and passports; it identifies a card at a glance and
 * is hard to fake by hand. Purely decorative for screen readers.
 */

const TAU = Math.PI * 2;
// Points per turn of the rolling circle: smooth at card size, light in the DOM.
const POINTS_PER_LOOP = 160;

/** A small deterministic generator (mulberry32), seeded by the number. */
const seeded = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** One hypotrochoid, closed: the curve a pen traces in a rolling circle. */
const rosette = (outer: number, inner: number, pen: number, turn: number) => {
  const loops = inner / gcd(outer, inner);
  const steps = POINTS_PER_LOOP * loops;
  const span = TAU * loops;
  let path = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * span;
    const k = (outer - inner) / inner;
    const x = (outer - inner) * Math.cos(t + turn) + pen * Math.cos(k * t);
    const y = (outer - inner) * Math.sin(t + turn) - pen * Math.sin(k * t);
    path += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${path}Z`;
};

/**
 * A seed from text (a certificate's serial), so certificates get their own
 * pattern the same way cards do from their number. FNV-1a, 32-bit.
 */
export const seedFromText = (text: string) => {
  let hash = 0x81_1c_9d_c5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash;
};

/** The three curves of one card's pattern. */
export const guillochePaths = (cardNumber: number) => {
  const random = seeded(cardNumber * 2_654_435_761);
  // Radii that close the curve in 5 to 13 loops (with an outer radius of 96).
  const inners = [27, 28, 30, 33, 39, 42, 44];
  return [0, 1, 2].map((layer) => {
    const inner = inners[Math.floor(random() * inners.length)] ?? 29;
    const pen = 24 + random() * 30 - layer * 6;
    return rosette(96, inner, pen, (layer * TAU) / 9 + random());
  });
};

export const Guilloche = ({
  className,
  number,
  stroke = "stroke-text-secondary",
}: {
  className?: string;
  number: number;
  stroke?: string;
}) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    viewBox="-130 -130 260 260"
  >
    {guillochePaths(number).map((d, layer) => (
      <path
        className={stroke}
        d={d}
        // biome-ignore lint/suspicious/noArrayIndexKey: three fixed layers
        key={layer}
        strokeWidth={0.35}
      />
    ))}
  </svg>
);
