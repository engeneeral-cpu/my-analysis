const crypto = require('crypto');

const attempts = new Map();
const sessions = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS = 3;

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 10 ? `+91${digits}` : null;
}

function allowSend(key) {
  const now = Date.now();
  const current = attempts.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + WINDOW_MS;
  }
  if (current.count >= MAX_SENDS) return false;
  current.count += 1;
  attempts.set(key, current);
  return true;
}

function credentialsReady() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  );
}

async function twilioRequest(path, params) {
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams(params);
  const response = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Verification provider error');
    error.status = response.status;
    throw error;
  }
  return data;
}

function createSession(phone) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { phone, createdAt: Date.now() });
  return token;
}

function readSessionCookie(req) {
  const header = req.headers.cookie || '';
  const match = header.split(';').map(v => v.trim()).find(v => v.startsWith('aarohi_session='));
  return match ? decodeURIComponent(match.slice('aarohi_session='.length)) : null;
}

function registerAuthRoutes(app) {
  app.post('/api/auth/send-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
    if (!credentialsReady()) return res.status(503).json({ success: false, error: 'OTP service is not configured on the server yet.' });
    if (!allowSend(phone)) return res.status(429).json({ success: false, error: 'Too many OTP requests. Please try again later.' });
    try {
      const result = await twilioRequest('Verifications', { To: phone, Channel: 'sms' });
      return res.json({ success: true, status: result.status || 'pending', message: 'OTP sent successfully.' });
    } catch (error) {
      console.error('[OTP send]', error.message);
      return res.status(error.status === 429 ? 429 : 502).json({ success: false, error: 'Unable to send OTP right now. Please try again.' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || '').replace(/\D/g, '');
    if (!phone || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, error: 'Enter a valid mobile number and 6-digit OTP.' });
    if (!credentialsReady()) return res.status(503).json({ success: false, error: 'OTP service is not configured on the server yet.' });
    try {
      const result = await twilioRequest('VerificationCheck', { To: phone, Code: code });
      if (result.status !== 'approved') return res.status(401).json({ success: false, error: 'Invalid or expired OTP.' });
      const session = createSession(phone);
      res.setHeader('Set-Cookie', `aarohi_session=${encodeURIComponent(session)}; Max-Age=28800; Path=/; HttpOnly; Secure; SameSite=Lax`);
      return res.json({ success: true, authenticated: true, message: 'Phone verified successfully.' });
    } catch (error) {
      console.error('[OTP verify]', error.message);
      return res.status(error.status === 404 ? 401 : 502).json({ success: false, error: 'OTP verification failed. Check the code and try again.' });
    }
  });

  app.get('/api/auth/session', (req, res) => {
    const token = readSessionCookie(req);
    const session = token ? sessions.get(token) : null;
    if (!session || Date.now() - session.createdAt > 8 * 60 * 60 * 1000) return res.status(401).json({ authenticated: false });
    res.json({ authenticated: true, phone: `${session.phone.slice(0, 3)}******${session.phone.slice(-2)}` });
  });
}

module.exports = { registerAuthRoutes };
