import { generatePresenterVideo } from '../../../../lib/media.mjs';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request) {
  try {
    return Response.json({ result: await generatePresenterVideo(await request.json()) });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Video generation failed.' },
      { status: 400 },
    );
  }
}
