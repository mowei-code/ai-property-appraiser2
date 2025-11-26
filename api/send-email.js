
import nodemailer from 'nodemailer';

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // 處理 CORS (如果前端和後端在不同 Domain 才需要，但在 Vercel 上通常是同源)
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

  const { smtpHost, smtpPort, smtpUser, smtpPass, to, cc, subject, text } = req.body;

  if (!smtpHost || !smtpUser || !smtpPass || !to) {
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

    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    const footer = `\n\n----------------------------------------\nAI Property Appraiser System Notification\nDate: ${now}`;
    const finalBody = text + footer;

    const info = await transporter.sendMail({
      from: `"AI Property Appraiser" <${smtpUser}>`,
      to: to, 
      cc: cc, 
      subject: subject,
      text: finalBody,
    });

    console.log(`[Vercel API] Email sent: ${info.messageId}`);
    res.status(200).json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error("[Vercel API] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
}
