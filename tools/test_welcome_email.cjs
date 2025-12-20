const fetch = require('node-fetch'); // NOTE: node-fetch might not be installed, using http module is safer for standard node environment or dynamic import
// actually standard node v18+ has fetch. v22 is definitely fine.
// but strictly speaking CommonJS 'require' of node-fetch can be tricky if version is new.
// Let's use standard http request to be safe from dependency issues.

const http = require('http');

const data = JSON.stringify({
    email: 'twmazy@gmail.com', // Use a real address to verify validity if possible, or user's test email
    name: 'TestUser',
    phone: '0912345678'
});

const options = {
    hostname: 'localhost',
    port: 3000, // Backend port
    path: '/api/auth/welcome',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Testing Welcome Email API at http://localhost:3000/api/auth/welcome ...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    let body = '';
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(data);
req.end();
