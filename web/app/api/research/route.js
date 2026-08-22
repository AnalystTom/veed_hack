import { buildResearchBrief, researchSubject, searchPublicContext, synthesizeResearchBrief } from '../../../lib/mvp.mjs';
import { searchOfficialSocialContext } from '../../../lib/social-api.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const summary = await researchSubject(body.kind, body.url);
    const officialContext = await searchOfficialSocialContext(summary);
    let publicContext;
    try {
      publicContext = await searchPublicContext(summary);
    } catch (error) {
      publicContext = {
        answer: '',
        results: [],
        mode: 'direct-public-data',
        warning: error instanceof Error ? `${error.message} Showing direct public data only.` : 'Showing direct public data only.',
      };
    }
    const sources = [...officialContext.results, ...publicContext.results];
    const deduplicatedSources = sources.filter((source, index) => source.url && sources.findIndex((candidate) => candidate.url === source.url) === index);
    publicContext = {
      ...publicContext,
      results: deduplicatedSources,
      mode: officialContext.results.length ? `${officialContext.mode}+${publicContext.mode}` : publicContext.mode,
      warning: [officialContext.warning, publicContext.warning].filter(Boolean).join(' '),
    };
    try {
      summary.researchBrief = await synthesizeResearchBrief(summary, publicContext);
      summary.researchMode = `${publicContext.mode}+gpt-5.6-luna-synthesis`;
      summary.researchWarning = publicContext.warning;
    } catch (error) {
      summary.researchBrief = buildResearchBrief(summary, publicContext);
      summary.researchMode = publicContext.mode;
      summary.researchWarning = [publicContext.warning, error instanceof Error ? `${error.message} Showing condensed direct findings instead.` : 'Showing condensed direct findings instead.'].filter(Boolean).join(' ');
    }
    return Response.json({ summary });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Research failed.' },
      { status: 400 },
    );
  }
}
