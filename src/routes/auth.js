const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const crypto = require('crypto');
const SibApiV3Sdk = require('sib-api-v3-sdk');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (name,email,password) VALUES ($1,$2,$3) RETURNING id,name,email',
      [name, email, hash]
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (e) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query(
      'SELECT * FROM users WHERE email=$1', [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Wrong password' });
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.json({ message: 'If email exists, reset link sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000);

    await db.query(
      `UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3`,
      [token, expiresAt, email]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = 'SmartDrive - Password Reset';
    sendSmtpEmail.htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:20px">
        <h2 style="color:#00D4FF">SmartDrive Password Reset</h2>
        <p>Hello ${user.name || 'there'},</p>
        <p>We received a request to reset your password. Click below:</p>
        <a href="${resetUrl}"
           style="background:#00D4FF;color:white;padding:14px 28px;
                  text-decoration:none;border-radius:8px;
                  display:inline-block;margin:16px 0;font-weight:bold">
          Reset My Password
        </a>
        <p style="color:#666;font-size:14px">This link expires in <strong>1 hour</strong>.</p>
        <p style="color:#666;font-size:14px">If you did not request this, ignore this email.</p>
      </div>
    `;
    sendSmtpEmail.sender = { name: 'SmartDrive', email: process.env.BREVO_SENDER_EMAIL };
    sendSmtpEmail.to = [{ email: email, name: user.name || '' }];

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.json({ message: 'If email exists, reset link sent' });
  } catch (e) {
    console.error('Forgot password error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const result = await db.query(
      `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [token]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    const hash = await bcrypt.hash(newPassword, 10);
    await db.query(
      `UPDATE users SET password = $1,
       reset_token = NULL, reset_token_expires = NULL
       WHERE id = $2`,
      [hash, user.id]
    );
    res.json({ message: 'Password reset successful' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;