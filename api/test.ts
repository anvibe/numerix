import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Test if fetch is available
    const hasNativeFetch = typeof globalThis.fetch === 'function';
    
    // Test environment variables
    const hasSupabaseUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
    const hasSupabaseKey = !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
    
    // Test node-fetch import
    let nodeFetchAvailable = false;
    try {
      await import('node-fetch');
      nodeFetchAvailable = true;
    } catch (e) {
      nodeFetchAvailable = false;
    }
    
    return res.status(200).json({
      success: true,
      message: 'Test endpoint working',
      environment: {
        nodeVersion: process.version,
        hasNativeFetch,
        nodeFetchAvailable,
        hasSupabaseUrl,
        hasSupabaseKey,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : String(error),
    });
  }
}

