import https from 'https';
import { initializeFirebaseAdmin } from './firebaseAdmin.js';
import { getDatabase } from 'firebase-admin/database';

const API_BASE_URL = 'https://prime-authority-backend.onrender.com';

const payload = {
  fullName: 'Verification Test',
  emailAddress: 'verify@example.com',
  mobileNumber: '1234567890',
  subject: 'Firebase fix verification',
  category: 'Other',
  message: 'This is a verification submission.'
};

const body = JSON.stringify(payload);

function postContact() {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: new URL(API_BASE_URL).hostname,
      port: 443,
      path: '/contact-form',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function verifyStorage() {
  initializeFirebaseAdmin();
  const db = getDatabase();
  const response = await postContact();

  await new Promise((resolve) => setTimeout(resolve, 1500));

  const snapshot = await db.ref('contacts').orderByChild('emailAddress').equalTo(payload.emailAddress).once('value');
  const contacts = snapshot.val() || {};
  const match = Object.entries(contacts).find(([, value]) => value?.subject === payload.subject && value?.message === payload.message);

  console.log(JSON.stringify({
    httpStatus: response.status,
    responseBody: response.body,
    stored: Boolean(match),
    entryId: match?.[0] || null,
    entry: match?.[1] || null,
  }, null, 2));
}

verifyStorage().catch((error) => {
  console.error(error);
  process.exit(1);
});
