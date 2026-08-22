import { generateBestComedyScript } from '../../../lib/comedy.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const plan = await generateBestComedyScript(body, { candidateCount: body.candidateCount });
    return Response.json({ plan });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Script generation failed.' },
      { status: 400 },
    );
  }
}
