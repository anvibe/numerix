import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Get Supabase client (lazy initialization)
function getSupabaseClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL or SUPABASE_URL environment variable is missing');
  }

  if (!supabaseKey && !serviceRoleKey) {
    throw new Error('VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is missing');
  }

  const key = serviceRoleKey || supabaseKey!;
  
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Helper function to create a unique key for an extraction
function getExtractionKey(extraction: {
  extraction_date: string;
  numbers: number[];
  wheels: unknown;
  jolly: number | null;
  superstar: number | null;
}): string {
  const sortedNumbers = [...extraction.numbers].sort((a, b) => a - b).join(',');
  const wheelsStr = extraction.wheels != null ? JSON.stringify(extraction.wheels) : 'null';
  return `${extraction.extraction_date}|${sortedNumbers}|${wheelsStr}|${extraction.jolly ?? 'null'}|${extraction.superstar ?? 'null'}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const gameType = (req.query.gameType as string) || req.body?.gameType || 'superenalotto';
    
    if (!['superenalotto', 'lotto', '10elotto', 'millionday'].includes(gameType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game type',
      });
    }

    console.log(`[cleanup-duplicates] Starting cleanup for ${gameType}...`);
    
    const supabase = getSupabaseClient();
    
    // Get all extractions for this game type (include wheels for Lotto duplicate key)
    const { data: extractions, error: fetchError } = await supabase
      .from('extractions')
      .select('id, extraction_date, numbers, wheels, jolly, superstar, created_at')
      .eq('game_type', gameType)
      .order('created_at', { ascending: true }); // Order by created_at to keep the oldest one
    
    if (fetchError) {
      console.error('[cleanup-duplicates] Error fetching extractions:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch extractions',
        details: fetchError.message,
      });
    }

    if (!extractions || extractions.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No extractions found',
        removed: 0,
        kept: 0,
      });
    }

    console.log(`[cleanup-duplicates] Found ${extractions.length} extractions`);

    // Group extractions by unique key (date + numbers + jolly + superstar)
    const extractionMap = new Map<string, typeof extractions>();
    
    extractions.forEach(extraction => {
      const key = getExtractionKey(extraction);
      if (!extractionMap.has(key)) {
        extractionMap.set(key, []);
      }
      extractionMap.get(key)!.push(extraction);
    });

    // Find duplicates (groups with more than 1 extraction)
    const duplicates: string[] = [];
    const toDelete: string[] = [];
    let totalKept = 0;

    extractionMap.forEach((group, key) => {
      if (group.length > 1) {
        duplicates.push(key);
        // Keep the first one (oldest by created_at), delete the rest
        const sorted = group.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const toKeep = sorted[0];
        const toRemove = sorted.slice(1);
        
        totalKept += 1;
        toDelete.push(...toRemove.map(e => e.id));
        
        console.log(`[cleanup-duplicates] Found ${group.length} duplicates for key ${key}, keeping ${toKeep.id}, removing ${toRemove.length} duplicates`);
      } else {
        totalKept += 1;
      }
    });

    if (toDelete.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No duplicates found',
        removed: 0,
        kept: totalKept,
      });
    }

    console.log(`[cleanup-duplicates] Removing ${toDelete.length} duplicate extractions...`);

    // Delete duplicates in batches
    const batchSize = 100;
    let deleted = 0;
    
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      
      const { error: deleteError } = await supabase
        .from('extractions')
        .delete()
        .in('id', batch);
      
      if (deleteError) {
        console.error(`[cleanup-duplicates] Error deleting batch ${i / batchSize + 1}:`, deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete duplicates',
          details: deleteError.message,
          deleted: deleted,
        });
      }
      
      deleted += batch.length;
      console.log(`[cleanup-duplicates] Deleted batch ${i / batchSize + 1}/${Math.ceil(toDelete.length / batchSize)}: ${batch.length} items`);
    }

    console.log(`[cleanup-duplicates] Cleanup completed: removed ${deleted} duplicates, kept ${totalKept} unique extractions`);

    return res.status(200).json({
      success: true,
      message: `Successfully removed ${deleted} duplicate extractions`,
      removed: deleted,
      kept: totalKept,
      duplicatesFound: duplicates.length,
    });
  } catch (error) {
    console.error('[cleanup-duplicates] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

