// Variant metadata lives in a plain module, not in the variant files: two of
// the variants are Client Components, and a server page importing a non-component
// value across the 'use client' boundary receives a client reference, not the value.
export const VARIANT_META = [
  { key: 'A', name: 'Premiere — cinematic hero, filmstrip below' },
  { key: 'B', name: 'Feed — full-bleed vertical snap reel' },
  { key: 'C', name: 'Ledger — dev-native table + sticky preview' },
  { key: 'D', name: 'Wall — heat-ranked mosaic, headline overlaid' },
] as const;
