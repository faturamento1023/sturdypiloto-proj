import { ambientePiloto } from '../../ambiente';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', ambiente: ambientePiloto() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
