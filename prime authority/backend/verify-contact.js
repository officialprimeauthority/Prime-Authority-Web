const http = require('http');

const payload = JSON.stringify({
  fullName: 'Verification Test',
  emailAddress: 'verify@example.com',
  mobileNumber: '1234567890',
  subject: 'Firebase fix verification',
  category: 'Other',
  message: 'This is a verification submission.'
});

const req = http.request({
  host: '127.0.0.1',
  port: 5002,
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
