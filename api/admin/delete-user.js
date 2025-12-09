import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin outside handler for potential cache reuse
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin = null;

if (SUPABASE_URL && SERVICE_ROLE_KEY) {
    supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    if (!supabaseAdmin) {
        const debugInfo = `URL=${!!SUPABASE_URL}, Key=${!!SERVICE_ROLE_KEY}, KeyLen=${SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.length : 0}`;
        return res.status(500).json({ success: false, message: `Server misconfigured: No Admin Client. (${debugInfo})` });
    }

    const { email } = req.body;

    try {
        const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
        if (searchError) throw searchError;

        const targetUser = users.find(u => u.email === email);

        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found in Auth.' });
        }

        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
        if (deleteError) throw deleteError;

        console.log(`[Vercel API] User deleted from Auth: ${email}`);
        return res.status(200).json({ success: true, message: 'User deleted successfully from Auth.' });

    } catch (e) {
        console.error('[Vercel API] Delete User Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}
