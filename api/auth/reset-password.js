import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// WORKAROUND: Vercel only exposes VITE_ prefixed env vars to Serverless Functions
// This is contrary to documentation but confirmed through testing
// Using VITE_ prefix for all environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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

    if (!supabaseAdmin) {
        const availableKeys = Object.keys(process.env)
            .filter(k => k.includes('SUPABASE'))
            .join(', ');
        const debugInfo = `URL=${!!SUPABASE_URL}, Key=${!!SERVICE_ROLE_KEY}, KeyLen=${SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.length : 0}, Available=[${availableKeys}]`;
        console.error('[Reset Password API] Supabase Admin not initialized:', debugInfo);
        console.error('[Reset Password API] CRITICAL: Vercel Serverless Functions cannot read VITE_ prefixed env vars!');
        console.error('[Reset Password API] Please add SUPABASE_SERVICE_ROLE_KEY (without VITE_ prefix) in Vercel Dashboard');
        return res.status(500).json({
            success: false,
            message: `Server misconfigured: No Admin Client. Please add SUPABASE_SERVICE_ROLE_KEY environment variable in Vercel (without VITE_ prefix). Debug: ${debugInfo}`
        });
    }

    const { email } = req.body;
    // For Vercel, we can assume https unless set otherwise, or rely on referer
    // req.headers.origin is usually available
    const origin = req.headers.origin || 'https://ai-property-appraiser.vercel.app';

    try {
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (settingsError || !settings) {
            return res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings.' });
        }

        const { smtp_host, smtp_port, smtp_user, smtp_pass } = settings;
        if (!smtp_host || !smtp_user || !smtp_pass) {
            return res.status(400).json({ success: false, message: 'SMTP settings incomplete in DB.' });
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

        console.log('[Vercel API] Recovery email sent.');
        return res.status(200).json({ success: true, message: 'Password reset email sent.' });

    } catch (e) {
        console.error('[Vercel API] Reset Password Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}
