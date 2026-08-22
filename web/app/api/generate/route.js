import { generateApprovedVideo } from '../../../lib/media.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    const result = await generateApprovedVideo(await request.json());
    return Response.json({ result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Media generation failed.' },
      { status: 400 },
    );
  }
}
