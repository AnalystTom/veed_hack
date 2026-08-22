import { referenceSourceDirection } from "./reference-signals.mjs";

export const INPUT_PROFILES = ["repo_only", "repo_plus_perception", "repo_plus_reference_signals", "repo_plus_reference_sources", "full_context"];

export function buildScenario({ repositoryPack, perceptionPack, profile, referenceSignals, referenceStrength = "light", treatment, instructions }) {
  if (!INPUT_PROFILES.includes(profile)) throw new Error(`Unknown input profile: ${profile}`);
  const includePerception = profile === "repo_plus_perception" || profile === "full_context";
  const includeReferenceSignals = profile === "repo_plus_reference_signals" || profile === "full_context";
  const includeReferenceSources = profile === "repo_plus_reference_sources" || profile === "full_context";
  const referenceDirection = [
    includeReferenceSignals && referenceSignals?.available ? `Reference-analysis pacing direction: ${referenceSignals.message}` : "",
    includeReferenceSources ? referenceSourceDirection(referenceSignals, referenceStrength) : "",
  ].filter(Boolean).join("\n\n");
  return {
    profile,
    project: {
      treatment,
      instructions: `${instructions || ""}${referenceDirection ? `\n\n${referenceDirection}` : ""}`.trim(),
      repositoryPack,
      researchPack: {
        mode: includePerception ? perceptionPack.mode : "excluded_by_benchmark_profile",
        message: includePerception ? perceptionPack.message : "Perception sources excluded by benchmark profile.",
        evidence: includePerception ? [...repositoryPack.evidence, ...perceptionPack.evidence] : repositoryPack.evidence,
        perception: includePerception ? perceptionPack.perception : [],
      },
    },
    sourceMix: {
      repositoryEvidence: repositoryPack.evidence.length,
      perceptionEvidence: includePerception ? perceptionPack.evidence.length : 0,
      referenceSignals: includeReferenceSignals ? referenceSignals || null : null,
      referenceSources: includeReferenceSources ? referenceSignals?.referenceCards?.map(({ id, sourceUrl, title }) => ({ id, sourceUrl, title })) || [] : [],
      referenceStrength: includeReferenceSources ? referenceStrength : null,
    },
  };
}
