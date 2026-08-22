import { generateNarration } from '../../../../lib/media.mjs';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request) {
  try {
    return Response.json({ result: await generateNarration(await request.json()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Narration generation failed.' },
      { status: 400 },
    );
  }
}
