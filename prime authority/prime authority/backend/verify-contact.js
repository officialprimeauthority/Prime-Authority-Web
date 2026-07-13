const https = require('https');

const API_BASE_URL = 'https://prime-authority-backend.onrender.com';

const payload = JSON.stringify({
  fullName: 'Verification Test',
  emailAddress: 'verify@example.com',
  mobileNumber: '1234567890',
  subject: 'Firebase fix verification',
  category: 'Other',
  message: 'This is a verification submission.'
});

const req = https.request({
  hostname: new URL(API_BASE_URL).hostname,
  port: 443,
  path: '/contact-form',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log(JSON.stringify({ status: res.statusCode, body: data }, null, 2));
  });
});

req.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

req.write(payload);
req.end();
