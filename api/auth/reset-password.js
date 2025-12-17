import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// Standard logic: Use VITE_SUPABASE_URL (public) and SUPABASE_SERVICE_ROLE_KEY (private/backend-only)
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Critical check: If key is missing, fail fast.
    if (!supabaseAdmin) {
        console.error('[Reset Password API] Supabase Admin not initialized.');

        // DEBUG: List all keys to see what Vercel is actually giving us
        const allEnvKeys = Object.keys(process.env).sort();
        const supabaseKeys = allEnvKeys.filter(k => k.includes('SUPABASE'));

        // Force the debug info into the message string so the UI displays it
        const debugMessage = `Debug Failed. Vars Found: [${supabaseKeys.join(', ')}]. Total vars: ${allEnvKeys.length}`;

        return res.status(500).json({
            success: false,
            message: debugMessage
        });
    }

    const { email } = req.body;
    const origin = req.headers.origin || 'https://ai-property-appraiser.vercel.app';

    try {
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (settingsError || !settings) {
            return res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings from database.' });
        }

        const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings;
        if (!smtp_host || !smtp_user || !smtp_pass) {
            return res.status(400).json({ success: false, message: 'SMTP settings are incomplete.' });
        }

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: { redirectTo: `${origin}/?reset=true` }
        });

        if (linkError) throw linkError;
        const recoveryLink = linkData.properties.action_link;

        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: Number(smtp_port) || 587,
            secure: Number(smtp_port) === 465,
            auth: { user: smtp_user, pass: smtp_pass },
            tls: { rejectUnauthorized: false }
        });

        const mailText = `親愛的會員您好，\n\n我們收到了您重設密碼的請求。\n請點擊下方連結以重設您的密碼：\n\n${recoveryLink}\n\n若您未發出此請求，請忽略此信件。\n\n--\nAI Property Appraiser`;

        await transporter.sendMail({
            from: `"AI Property Appraiser" <${smtp_user}>`,
            to: email,
            subject: '[AI房產估價師] 重設密碼通知',
            text: mailText
        });

        return res.status(200).json({ success: true, message: 'Password reset email sent successfully.' });

    } catch (e) {
        console.error('[Reset Password API] Error:', e);
        return res.status(500).json({ success: false, message: e.message || 'Internal Server Error' });
    }
}
