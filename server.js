import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env
import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Init Supabase Admin (Service Role)
import { createClient } from '@supabase/supabase-js';
// Note: These env vars must be set in the environment where node server.js runs
// or loaded via dotenv if you add 'dotenv' package.
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
  console.log('[Server] Supabase Admin initialized.');
} else {
  console.warn('[Server] WARNING: SUPABASE_URL or SERVICE_ROLE_KEY missing. Admin actions will fail.');
}

app.post('/api/send-email', async (req, res) => {
  // 接收完整參數
  const { smtpHost, smtpPort, smtpUser, smtpPass, to, cc, subject, text } = req.body;

  console.log('------------------------------------------------');
  console.log('[Server Node.js] 收到發信請求');
  console.log(`[Server] SMTP Host: ${smtpHost}`);
  console.log(`[Server] User: ${smtpUser}`);
  console.log(`[Server] To (會員): ${to}`);
  console.log(`[Server] CC (管理員): ${cc}`);

  if (!smtpHost || !smtpUser || !smtpPass || !to) {
    console.error('[Server] 缺少必要設定 (Host, User, Pass, To)');
    return res.status(400).json({ success: false, message: 'Missing SMTP configuration or Recipient.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();
    console.log('[Server] SMTP 連線驗證成功');

    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const footer = `\n\n----------------------------------------\nAI Property Appraiser System Notification\nDate: ${now}`;
    const finalBody = text + footer;

    const info = await transporter.sendMail({
      from: `"AI Property Appraiser" <${smtpUser}>`, // 強制與驗證帳號一致
      to: to,
      cc: cc,
      subject: subject,
      text: finalBody,
    });

    console.log(`[Server] 發送成功！Message ID: ${info.messageId}`);
    console.log('------------------------------------------------');
    res.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error("[Server] 發送錯誤:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Admin: Delete User (Auth + Profile) ---
app.post('/api/admin/delete-user', async (req, res) => {
  const { email } = req.body;
  console.log(`[Server] Request to delete user: ${email}`);

  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, message: 'Server misconfigured: No Admin Client.' });
  }

  try {
    // 1. Get User ID from Profile first (assuming profiles table exists and is sync)
    // Alternatively, search by email in Auth admin API
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;

    const targetUser = users.find(u => u.email === email);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found in Auth.' });
    }

    // 2. Delete from Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
    if (deleteError) throw deleteError;

    console.log(`[Server] User deleted from Auth: ${email}`);

    // 3. Profile deletion usually happens via Cascade or logic in Frontend, 
    // but we can ensure it here if we want double safety. 
    // We'll leave it to the frontend/database constraints to clean up the profile 
    // OR the frontend calls this *and* then refreshes. 
    // Better: The frontend AuthContext handles the UI update.

    return res.json({ success: true, message: 'User deleted successfully from Auth.' });

  } catch (e) {
    console.error('[Server] Delete User Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// --- Admin: Update Password ---
app.post('/api/admin/update-password', async (req, res) => {
  const { email, password } = req.body;
  console.log(`[Server] Request to update password for: ${email}`);

  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, message: 'Server misconfigured: No Admin Client.' });
  }

  try {
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    if (searchError) throw searchError;

    const targetUser = users.find(u => u.email === email);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found in Auth.' });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, { password: password });
    if (updateError) throw updateError;

    console.log(`[Server] Password updated for: ${email}`);
    return res.json({ success: true, message: 'Password updated successfully.' });

  } catch (e) {
    console.error('[Server] Update Password Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});


// --- Auth: Custom Password Reset ---
app.post('/api/auth/reset-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[Server] Request access/reset for: ${email}`);

  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, message: 'Server misconfigured: No Admin Client.' });
  }

  try {
    // 1. Fetch System Settings for SMTP
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

    // 2. Generate Recovery Link
    // Correctly handle Localhost vs Production logic
    let redirectBase = req.headers.origin;

    // Fallback if origin is missing (common in some proxy setups)
    if (!redirectBase) {
      redirectBase = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    }

    // DEBUG: Force localhost if we are running locally to avoid Vercel redirect
    if (redirectBase.includes('localhost')) {
      // Ensure protocol is http for localhost
      if (redirectBase.startsWith('https://')) {
        redirectBase = redirectBase.replace('https://', 'http://');
      }
    }

    console.log(`[Server] Headers Origin: ${req.headers.origin}`);
    console.log(`[Server] Computed Redirect Base: ${redirectBase}`);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: { redirectTo: `${redirectBase}/?reset=true` }
    });

    if (linkError) throw linkError;
    let recoveryLink = linkData.properties.action_link;

    // HACK: Supabase might have ignored our redirectTo param if not in whitelist.
    // We force-rewrite it here so the user at least gets the correct link in email.
    // If Supabase API blocks the redirect on click, the user will see a specific error then.
    if (redirectBase && redirectBase.includes('localhost')) {
      const urlObj = new URL(recoveryLink);
      urlObj.searchParams.set('redirect_to', `${redirectBase}/?reset=true`);
      recoveryLink = urlObj.toString();
      // Also fix the double slash issue if present from Supabase config
      recoveryLink = recoveryLink.replace('//.vercel.app', '.vercel.app');
    }

    console.log(`[Server] Recovery Link Generated (Rewritten): ${recoveryLink}`);

    // 3. Send Email
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

    console.log('[Server] Recovery email sent.');
    return res.json({ success: true, message: 'Password reset email sent.' });

  } catch (e) {
    console.error('[Server] Reset Password Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

// --- Auth: Welcome Email (Server-Side) ---
app.post('/api/auth/welcome', async (req, res) => {
  const { email, name, phone } = req.body;

  if (!supabaseAdmin) {
    return res.status(500).json({ success: false, message: 'Server misconfigured' });
  }

  try {
    console.log(`[Server] Sending welcome email to: ${email}`);
    // 1. Fetch SMTP
    const { data: settings } = await supabaseAdmin.from('system_settings').select('*').limit(1).maybeSingle();

    if (!settings || !settings.smtp_host) {
      console.error('[Server] Welcome Email Failed: No SMTP settings.');
      return res.status(400).json({ success: false, message: 'Settings missing' });
    }

    const { smtp_host, smtp_port, smtp_user, smtp_pass, system_email } = settings;

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

    console.log(`[Server] Welcome email sent to ${email}`);
    return res.json({ success: true });

  } catch (e) {
    console.error('[Server] Welcome Email Error:', e);
    return res.status(500).json({ success: false, message: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});