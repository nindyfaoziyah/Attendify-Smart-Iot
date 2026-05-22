const http = require('http');

// create 80MB payload
const largeString = 'A'.repeat(40 * 1024 * 1024); 
const data = JSON.stringify({
  user_id: 16,
  images: ["data:image/jpeg;base64," + largeString, "data:image/jpeg;base64," + largeString]
}); // 80MB approx

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/face/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`BODY: ${body.substring(0, 100)}...`);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
