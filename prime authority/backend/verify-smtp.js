import http from 'http';
import { initializeFirebaseAdmin, getFirebaseAuth } from './firebaseAdmin.js';

const contactPayload = {
  fullName: 'SMTP Verify',
  emailAddress: 'verify@example.com',
  mobileNumber: '1234567890',
  subject: 'SMTP Verify',
  category: 'Other',
  message: 'SMTP verification request.'
};

function postJson(path, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  initializeFirebaseAdmin();
  const auth = getFirebaseAuth();
  const users = await auth.listUsers(5);
  const targetEmail = users.users.find((user) => user.email)?.email || 'officialprimeauthority@gmail.com';
  console.log('Using forgot-password target email:', targetEmail);

  const contactResult = await postJson('/contact-form', contactPayload);
  console.log('CONTACT_RESULT', JSON.stringify(contactResult));

  const forgotResult = await postJson('/forgot-password', { email: targetEmail });
  console.log('FORGOT_RESULT', JSON.stringify(forgotResult));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
