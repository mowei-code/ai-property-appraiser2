import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

// WORKAROUND: Vercel only exposes VITE_ prefixed env vars to Serverless Functions
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

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
    // CORS headers
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
        return res.status(500).json({ success: false, message: 'Server misconfigured: No Admin Client' });
    }

    const { email, name, phone } = req.body;

    try {
        // 1. Fetch SMTP Settings
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (settingsError || !settings) {
            return res.status(500).json({ success: false, message: 'Failed to fetch SMTP settings.' });
        }

        const { smtp_host, smtp_port, smtp_user, smtp_pass, system_email } = settings;

        if (!smtp_host || !smtp_user || !smtp_pass) {
            return res.status(400).json({ success: false, message: 'SMTP settings incomplete in DB.' });
        }

        // 2. Send Email
        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: Number(smtp_port) || 587,
            secure: Number(smtp_port) === 465,
            auth: { user: smtp_user, pass: smtp_pass },
            tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
            from: `"AI Property Appraiser" <${smtp_user}>`,
            to: email,
            cc: system_email,
            subject: `[AI房產估價師] 歡迎加入！註冊成功通知`,
            text: `親愛的 ${name} 您好，\n\n歡迎加入 AI 房產估價師！\n您的帳號已建立成功。\n\n註冊資訊：\nEmail: ${email}\n電話: ${phone}\n\n(此信件由系統自動發送)`
        });

        console.log(`[Vercel API] Welcome email sent to ${email}`);
        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('[Vercel API] Welcome Email Error:', e);
        return res.status(500).json({ success: false, message: e.message });
    }
}
