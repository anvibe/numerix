import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseServerClient, requireUserIdFromAuthHeader } from '../_supabaseServer.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabase = getSupabaseServerClient();
    const userId = await requireUserIdFromAuthHeader(supabase, req.headers.authorization);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('unsuccessful_combinations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ data: data ?? [] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const insertData = { ...(body ?? {}), user_id: userId };

      const { error } = await supabase.from('unsuccessful_combinations').insert(insertData);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : null;
      const clear = req.query.clear === '1' || req.query.clear === 'true';

      if (clear) {
        const { error } = await supabase.from('unsuccessful_combinations').delete().eq('user_id', userId);
        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      if (!id) return res.status(400).json({ error: 'Missing id (or clear=true)' });
      const { error } = await supabase
        .from('unsuccessful_combinations')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes('Authorization') || message.includes('session') ? 401 : 500;
    return res.status(status).json({ error: message });
  }
}

