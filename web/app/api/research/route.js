import { researchSubject } from '../../../lib/mvp.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const summary = await researchSubject(body.kind, body.url);
    return Response.json({ summary });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Research failed.' },
      { status: 400 },
    );
  }
}
