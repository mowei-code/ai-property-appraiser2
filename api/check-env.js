// Diagnostic endpoint to check environment variables
// Access at: https://your-app.vercel.app/api/check-env

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // Check environment variables (without exposing actual values)
    const envCheck = {
        VITE_SUPABASE_URL: {
            set: !!process.env.VITE_SUPABASE_URL,
            length: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.length : 0,
            preview: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.substring(0, 20) + '...' : 'NOT SET'
        },
        VITE_SUPABASE_ANON_KEY: {
            set: !!process.env.VITE_SUPABASE_ANON_KEY,
            length: process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY.length : 0,
            preview: process.env.VITE_SUPABASE_ANON_KEY ? '***' + process.env.VITE_SUPABASE_ANON_KEY.slice(-4) : 'NOT SET'
        },
        VITE_SUPABASE_SERVICE_ROLE_KEY: {
            set: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
            length: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY.length : 0,
            preview: process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ? '***' + process.env.VITE_SUPABASE_SERVICE_ROLE_KEY.slice(-4) : 'NOT SET'
        },
        SUPABASE_SERVICE_ROLE_KEY: {
            set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            length: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
            preview: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***' + process.env.SUPABASE_SERVICE_ROLE_KEY.slice(-4) : 'NOT SET'
        }
    };

    // List all SUPABASE-related env vars (names only)
    const allSupabaseKeys = Object.keys(process.env)
        .filter(k => k.includes('SUPABASE'))
        .sort();

    // List ALL environment variable names (for debugging)
    const allEnvKeys = Object.keys(process.env).sort();

    const allOk = envCheck.VITE_SUPABASE_URL.set &&
        envCheck.VITE_SUPABASE_ANON_KEY.set &&
        (envCheck.VITE_SUPABASE_SERVICE_ROLE_KEY.set || envCheck.SUPABASE_SERVICE_ROLE_KEY.set);

    return res.status(200).json({
        success: true,
        status: allOk ? 'ALL_OK' : 'MISSING_VARS',
        message: allOk
            ? '✅ All required environment variables are set'
            : '❌ Some required environment variables are missing',
        environmentVariables: envCheck,
        availableSupabaseKeys: allSupabaseKeys,
        allEnvironmentKeys: allEnvKeys, // Show ALL env var names for debugging
        totalEnvCount: allEnvKeys.length,
        recommendations: allOk ? [] : [
            !envCheck.VITE_SUPABASE_URL.set && 'Set VITE_SUPABASE_URL in Vercel Dashboard',
            !envCheck.VITE_SUPABASE_ANON_KEY.set && 'Set VITE_SUPABASE_ANON_KEY in Vercel Dashboard',
            !(envCheck.VITE_SUPABASE_SERVICE_ROLE_KEY.set || envCheck.SUPABASE_SERVICE_ROLE_KEY.set) && 'Set VITE_SUPABASE_SERVICE_ROLE_KEY in Vercel Dashboard'
        ].filter(Boolean)
    });
}
