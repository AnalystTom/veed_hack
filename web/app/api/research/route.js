import { buildResearchBrief, researchSubject, searchPublicContext } from '../../../lib/mvp.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const summary = await researchSubject(body.kind, body.url);
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
    summary.researchBrief = buildResearchBrief(summary, publicContext);
    summary.researchMode = publicContext.mode;
    summary.researchWarning = publicContext.warning;
    return Response.json({ summary });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Research failed.' },
      { status: 400 },
    );
  }
}
