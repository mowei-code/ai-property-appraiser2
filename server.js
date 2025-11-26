import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
    console.log(`✅ Backend server running at http://localhost:${PORT}`);
});