import type { VercelRequest, VercelResponse } from './types.js';
import { getSupabaseServerClient, requireUserIdFromAuthHeader } from './_supabaseServer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabaseServerClient();
    // Require auth so this endpoint doesn't become a public mirror.
    await requireUserIdFromAuthHeader(supabase, req.headers.authorization);

    const gameType = typeof req.query.gameType === 'string' ? req.query.gameType : null;
    if (!gameType) return res.status(400).json({ error: 'Missing gameType' });

    const pageSize = 1000;
    let from = 0;
    let all: any[] = [];

    while (true) {
      const { data, error } = await supabase
        .from('extractions')
        .select('game_type, extraction_date, numbers, wheels, jolly, superstar')
        .eq('game_type', gameType)
        .order('extraction_date', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      const batch = data ?? [];
      all = all.concat(batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    return res.status(200).json({ data: all });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes('Authorization') || message.includes('session') ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}
