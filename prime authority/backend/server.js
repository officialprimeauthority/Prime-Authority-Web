import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeFirebaseAdmin, getFirebaseAuth } from './firebaseAdmin.js';
import { getDatabase } from 'firebase-admin/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 5001);
const env = process.env.NODE_ENV || 'development';
const forgotPasswordCooldowns = new Map();
const FORGOT_PASSWORD_COOLDOWN_MS = 5 * 60 * 1000;
const FRONTEND_BASE_URL = process.env.FRONTEND_RESET_URL || 'https://primeauthority.netlify.app';

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000,https://primeauthority.netlify.app,https://prime-authority-backend.onrender.com')
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

async function sendMailWithBrevo(message) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoFromEmail = process.env.BREVO_FROM_EMAIL || 'officialprimeauthority@gmail.com';
  
  if (!brevoApiKey) {
    console.error('[Brevo] ERROR: BREVO_API_KEY environment variable is not set!');
    return { sent: false, reason: 'Brevo API key not configured' };
  }

  try {
    const payload = {
      sender: {
        name: 'Prime Authority',
        email: brevoFromEmail
      },
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html
    };

    if (message.replyTo) {
      payload.replyTo = { email: message.replyTo };
    }

    console.log(`[Brevo] Attempting to send email to: ${message.to}`);
    console.log(`[Brevo] API Key present: ${brevoApiKey ? 'YES' : 'NO'}`);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[Brevo] HTTP ${response.status} - Response:`, responseText);
      return { sent: false, reason: `HTTP ${response.status}: ${responseText}` };
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { messageId: 'unknown' };
    }

    console.log(`[Brevo] ✅ Email sent successfully to ${message.to}. Message ID:`, result.messageId);
    return { sent: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Brevo] Exception while sending email:', error.message, error.stack);
    return { sent: false, reason: error.message };
  }
}
function buildCustomResetLink(firebaseLink) {
  try {
    const url = new URL(firebaseLink);
    const oobCode = url.searchParams.get('oobCode');

    if (!oobCode) {
      console.error('No oobCode found in Firebase reset link');
      return null;
    }

   return `https://primeauthority.website/reset-password.html?oobCode=${encodeURIComponent(oobCode)}`;
  } catch (error) {
    console.error('Failed to build custom reset link:', error);
    return null;
  }
}

async function sendResetLinkEmail(email, resetLink) {
  const message = {
    from: process.env.BREVO_FROM_EMAIL || 'officialprimeauthority@gmail.com',
    to: email,
    subject: 'Reset your Prime Authority password',
    html: `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Password Reset</h2>
          <p>Hello,</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
          <p>Or copy this link: ${resetLink}</p>
        </body>
      </html>
    `,
  };

  console.log(`[sendResetLinkEmail] Preparing to send password reset email to: ${email}`);
  return sendMailWithBrevo(message);
}

async function sendContactFormEmail(payload) {
  const recipient = process.env.CONTACT_TO || process.env.BREVO_FROM_EMAIL || 'officialprimeauthority@gmail.com';
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="margin-bottom: 8px; color: #007bff;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Full Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.fullName || '-'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.emailAddress || '-'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mobile:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.mobileNumber || '-'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Subject:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.subject || '-'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Organization / Team:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.organization || '-'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Category:</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${payload.category || '-'}</td></tr>
        </table>
        <h3 style="margin-top: 20px; color: #007bff;">Message:</h3>
        <p style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #007bff;">
          ${(payload.message || '-').replace(/\n/g, '<br>')}
        </p>
      </body>
    </html>
  `;

  const message = {
    from: process.env.BREVO_FROM_EMAIL || 'officialprimeauthority@gmail.com',
    to: recipient,
    replyTo: payload.emailAddress,
    subject: `[Contact Form] ${payload.subject || 'Contact Request'}`,
    html,
  };

  console.log(`[sendContactFormEmail] Preparing to send contact form email to: ${recipient}, reply-to: ${payload.emailAddress}`);
  return sendMailWithBrevo(message);
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
      url: `${FRONTEND_BASE_URL}/reset-password.html`,
      handleCodeInApp: false,
    };

    const resetLink = await auth.generatePasswordResetLink(normalizedEmail, actionCodeSettings);
    const customResetLink = buildCustomResetLink(resetLink);
    console.log('Reset Link Generated:', resetLink);
    console.log('Custom Reset Link:', customResetLink || 'Unable to build custom link');

    const mailResult = await sendResetLinkEmail(normalizedEmail, customResetLink || resetLink);

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
