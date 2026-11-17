/**
 * The Environmental Paper Network's Paper Calculator (decisions.md, Where
 * the Society stands: Sustainability), which converts the sheets the site
 * kept from being printed into paper, wood, water and greenhouse gas.
 * Cited on About as "Environmental Paper Network Paper Calculator v4.1".
 * The figures per sheet are read from the calculator for uncoated
 * freesheet copy paper with no recycled content; until they are entered
 * here, About shows the counts alone and converts nothing.
 */
export interface PerSheet {
  /** Greenhouse gas, pounds of CO2 equivalent. */
  readonly co2eLbs: number;
  /** Water consumed, gallons. */
  readonly waterGallons: number;
  /** Wood used, pounds. */
  readonly woodLbs: number;
}

export const PAPER_CALCULATOR: {
  readonly perSheet: PerSheet | null;
  readonly url: string;
  readonly version: string;
} = {
  perSheet: null,
  url: "https://c.environmentalpaper.org/",
  version: "4.1",
};
