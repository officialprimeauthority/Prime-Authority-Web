import dns from 'dns';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeFirebaseAdmin, getFirebaseAuth } from './firebaseAdmin.js';
import { getDatabase } from 'firebase-admin/database';

// Prefer IPv4 for outbound SMTP to avoid Gmail IPv6 timeouts from this environment.
dns.setDefaultResultOrder('ipv4first');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 5001);
const env = process.env.NODE_ENV || 'development';
const forgotPasswordCooldowns = new Map();
const FORGOT_PASSWORD_COOLDOWN_MS = 5 * 60 * 1000;
const FRONTEND_BASE_URL = process.env.FRONTEND_RESET_URL || 'https://prime-authority.netlify.app';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,https://prime-authority.netlify.app,https://prime-authority-backend.onrender.com')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin || allowedOrigins.includes(origin.replace(/\/$/, '')) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || /\.netlify\.app$/i.test(origin);

  if (isAllowedOrigin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

try {
  initializeFirebaseAdmin();
  console.log('Firebase Admin initialized successfully.');
} catch (error) {
  console.error('Firebase Admin initialization failed:', error.message);
  console.log('Please create a Firebase service account JSON file and set FIREBASE_SERVICE_ACCOUNT_PATH in your .env file.');
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function getSmtpCandidates() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const requestedPort = Number(process.env.SMTP_PORT || 465);
  const requestedSecure = process.env.SMTP_SECURE === 'true' || requestedPort === 465;
  const baseConfig = {
    host,
    auth: { user, pass },
    family: 4,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout:20000,
    //requireTLS: true,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4, all: false }, (error, address) => {
        callback(error, address, 4);
      });
    },
  };

  const candidates = [
    { ...baseConfig, port: requestedPort, secure: requestedSecure },
  ];

  if (requestedPort !== 465) {
    candidates.push({ ...baseConfig, port: 465, secure: true });
  }

  if (requestedPort !== 587) {
    candidates.push({ ...baseConfig, port: 587, secure: false });
  }

  return candidates;
}

async function sendMailWithFallback(message) {
  const configuredUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const configuredPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!process.env.SMTP_HOST || !configuredUser || !configuredPass) {
    console.error('SMTP not configured. Missing SMTP_HOST/SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS in environment.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const nodemailer = await import('nodemailer');
    const candidates = getSmtpCandidates();
    let lastError = null;

    console.log('[SMTP] Configured transport:', {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT || 465) === 465,
      user: configuredUser,
      from: process.env.SMTP_FROM || configuredUser,
      requireTLS: true,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });

    for (const config of candidates) {
      const transporter = nodemailer.createTransport(config);
      try {
        const resolvedAddress = await new Promise((resolve, reject) => {
          dns.lookup(config.host, { family: 4, all: false }, (error, address) => {
            if (error) {
              reject(error);
            } else {
              resolve(address);
            }
          });
        });

        console.log(`[SMTP] Verifying connection to ${config.host}:${config.port} using IPv4 ${resolvedAddress}...`);
        await transporter.verify();
        console.log(`[SMTP] Connection verified for ${config.host}:${config.port} using IPv4 ${resolvedAddress}`);
        await transporter.sendMail(message);
        return { sent: true, usedAddress: resolvedAddress };
      } catch (error) {
        lastError = error;
        console.error(`[SMTP] Attempt failed for ${config.host}:${config.port}`, {
          message: error.message,
          code: error.code,
          response: error.response,
          responseCode: error.responseCode,
          stack: error.stack,
        });
      }
    }

    return { sent: false, reason: lastError?.message || 'SMTP send failed' };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { sent: false, reason: error.message };
  }
}

async function sendResetLinkEmail(email, resetLink) {
  const message = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Reset your Prime Authority password',
    html: `<p>Hello,</p><p>Use the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  };

  return sendMailWithFallback(message);
}

async function sendContactFormEmail(payload) {
  const recipient = process.env.CONTACT_TO || process.env.SMTP_FROM || process.env.SMTP_USER;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin-bottom: 8px;">New Contact Form Submission</h2>
      <p><strong>Full Name:</strong> ${payload.fullName || '-'}</p>
      <p><strong>Email:</strong> ${payload.emailAddress || '-'}</p>
      <p><strong>Mobile:</strong> ${payload.mobileNumber || '-'}</p>
      <p><strong>Subject:</strong> ${payload.subject || '-'}</p>
      <p><strong>Organization / Team:</strong> ${payload.organization || '-'}</p>
      <p><strong>Category:</strong> ${payload.category || '-'}</p>
      <p><strong>Message:</strong></p>
      <p>${(payload.message || '').replace(/\n/g, '<br>')}</p>
    </div>
  `;

  const message = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    replyTo: payload.emailAddress || payload.userEmail || process.env.SMTP_USER,
    subject: `New Contact Form: ${payload.subject || 'Contact Request'}`,
    html,
  };

  return sendMailWithFallback(message);
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Prime Authority backend is running.',
    environment: env,
  });
});

app.options('/forgot-password', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

app.options('/contact-form', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(204);
});

app.post('/contact-form', async (req, res) => {
  try {
    const payload = req.body || {};
    const requiredFields = ['fullName', 'emailAddress', 'mobileNumber', 'subject', 'category'];
    const missingField = requiredFields.find((field) => !String(payload[field] || '').trim());
    const messageRequired = String(payload.category || '').trim() === 'Other';

    if (missingField || (messageRequired && !String(payload.message || '').trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required contact fields.',
      });
    }

    const database = getDatabase();
    const firebasePayload = {
      ...payload,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      emailDelivery: 'pending',
      emailError: '',
    };

    await database.ref('contacts').push(firebasePayload);

    try {
      const mailResult = await sendContactFormEmail(payload);
      if (!mailResult.sent) {
        console.warn('Contact email delivery failed; submission was saved to Firebase.', mailResult.reason);
      }
    } catch (emailError) {
      console.error('Contact email delivery threw an error; submission was saved to Firebase.', emailError);
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been received successfully. We will review it shortly.',
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to save your message right now. Please try again later.',
    });
  }
});

app.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body?.email;

    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const auth = getFirebaseAuth();

    const cooldownUntil = forgotPasswordCooldowns.get(normalizedEmail);
    if (cooldownUntil && cooldownUntil > Date.now()) {
      return res.status(429).json({
        success: false,
        message: 'Please wait 5 minutes before requesting another reset link.',
      });
    }

    if (cooldownUntil && cooldownUntil <= Date.now()) {
      forgotPasswordCooldowns.delete(normalizedEmail);
    }

    try {
      await auth.getUserByEmail(normalizedEmail);
    } catch (lookupError) {
      if (lookupError?.code === 'auth/user-not-found') {
        return res.status(404).json({
          success: false,
          message: 'This gmail is not registered. Please sign up now.',
        });
      }

      throw lookupError;
    }

    const actionCodeSettings = {
      url: FRONTEND_BASE_URL,
      handleCodeInApp: false,
    };

    const resetLink = await auth.generatePasswordResetLink(normalizedEmail, actionCodeSettings);
    console.log("Reset Link Generated:", resetLink);
    
    const mailResult = await sendResetLinkEmail(normalizedEmail, resetLink);

    if (process.env.NODE_ENV !== 'production' && process.env.DEBUG_RESET_LINK === 'true') {
      console.log('Password reset link:', resetLink);
    }

    forgotPasswordCooldowns.set(normalizedEmail, Date.now() + FORGOT_PASSWORD_COOLDOWN_MS);

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent successfully. Please check your email.',
      ...(process.env.NODE_ENV !== 'production' && process.env.DEBUG_RESET_LINK === 'true' ? { resetLink } : {}),
    });
  } catch (error) {
    const code = error?.code;

    if (code === 'auth/invalid-email') {
      return res.status(400).json({
        success: false,
        message: 'The provided email address is invalid.',
      });
    }

    console.error('Forgot password error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to process password reset request right now. Please try again later.',
    });
  }
});

app.use((err, _req, res, _next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy does not allow this origin.',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

app.listen(port, () => {
  console.log(`Prime Authority backend listening on port ${port}`);
});
