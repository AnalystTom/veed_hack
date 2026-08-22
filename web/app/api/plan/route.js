import { generateComedyScript } from '../../../lib/comedy.mjs';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    return Response.json({ plan: await generateComedyScript(body) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Script generation failed.' },
      { status: 400 },
    );
  }
}
