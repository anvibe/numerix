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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const hasSupabaseUrl = !!supabaseUrl;
    const hasSupabaseKey = !!supabaseKey;
    const hasServiceRoleKey = !!serviceRoleKey;
    
    // Test node-fetch import
    let nodeFetchAvailable = false;
    try {
      await import('node-fetch');
      nodeFetchAvailable = true;
    } catch (e) {
      nodeFetchAvailable = false;
    }
    
    // Check what's missing
    const missing: string[] = [];
    if (!hasSupabaseUrl) missing.push('VITE_SUPABASE_URL or SUPABASE_URL');
    if (!hasSupabaseKey && !hasServiceRoleKey) missing.push('VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
    
    return res.status(200).json({
      success: true,
      message: missing.length > 0 ? `Missing environment variables: ${missing.join(', ')}` : 'Test endpoint working',
      environment: {
        nodeVersion: process.version,
        hasNativeFetch,
        nodeFetchAvailable,
        variables: {
          hasSupabaseUrl,
          hasSupabaseKey,
          hasServiceRoleKey,
          supabaseUrlConfigured: hasSupabaseUrl,
          supabaseKeyConfigured: hasSupabaseKey || hasServiceRoleKey,
        },
        missing,
        recommendations: missing.length > 0 ? [
          'Go to Vercel Dashboard → Settings → Environment Variables',
          'Add the missing variables',
          'Select Production, Preview, and Development environments',
          'Redeploy the application'
        ] : [],
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

