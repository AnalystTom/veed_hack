// PROTOTYPE — throwaway route. Four radically different landing pages for the
// roast-video generator, switchable with ?variant=A|B|C|D.
//
// Question being answered: how should the sample roast templates be presented
// on the landing page — as a cinematic teaser, as the page itself, as a
// developer-tool catalogue, or as a wall of volume?
//
// Nothing here is production code. See prototype/README.md.

import PrototypeSwitcher from './PrototypeSwitcher';
import { ISOLATE } from './isolate';
import { VARIANT_META } from './variants/meta';
import VariantA from './variants/VariantA';
import VariantB from './variants/VariantB';
import VariantC from './variants/VariantC';
import VariantD from './variants/VariantD';

const COMPONENTS = { A: VariantA, B: VariantB, C: VariantC, D: VariantD } as const;
const VARIANTS = VARIANT_META.map((m) => ({ ...m, Component: COMPONENTS[m.key] }));


export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;
  const chosen = VARIANTS.find((v) => v.key === (variant ?? 'A').toUpperCase()) ?? VARIANTS[0];
  const { Component } = chosen;

  return (
    <>
      <style>{ISOLATE}</style>
      <div id="rp-root">
        <Component />
      </div>
      <PrototypeSwitcher
        variants={VARIANTS.map(({ key, name }) => ({ key, name }))}
        current={chosen.key}
      />
    </>
  );
}
