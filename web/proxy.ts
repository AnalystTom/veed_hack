import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// `/` serves the roast landing page (variant A). This override lives at the
// routing layer rather than in app/page.tsx because that file is owned by other
// work in this app — rewriting here leaves it untouched while still making the
// landing page the main UI. The URL stays `/`; only what renders changes.
export function proxy(request: NextRequest) {
  return NextResponse.rewrite(new URL('/prototype/landing?variant=A', request.url));
}

export const config = { matcher: '/' };
