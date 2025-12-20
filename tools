const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

console.log('Checking .env.local at:', envPath);

if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local file not found!');
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

const requiredKeys = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_SERVICE_ROLE_KEY'
];

const foundKeys = {};

lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
        const val = valueParts.join('=').trim();
        foundKeys[key.trim()] = val;
    }
});

console.log('\n--- Environment Variable Report ---');
let missing = false;

requiredKeys.forEach(key => {
    if (foundKeys[key]) {
        const val = foundKeys[key];
        let preview = '******';
        if (val.length > 5) {
            preview = val.slice(0, 3) + '...' + val.slice(-3);
        }
        console.log(`[OK]   ${key} is set. (Value: ${preview})`);
    } else {
        console.error(`[FAIL] ${key} is MISSING.`);
        missing = true;
    }
});

if (foundKeys['SUPABASE_SERVICE_ROLE_KEY'] && !foundKeys['VITE_SUPABASE_SERVICE_ROLE_KEY']) {
    console.warn(`[WARN] SUPABASE_SERVICE_ROLE_KEY is set, but VITE_SUPABASE_SERVICE_ROLE_KEY is missing. You might need to add the VITE_ prefix for frontend access if intended.`);
}

console.log('-----------------------------------');

if (missing) {
    console.error('\nResult: MISSING REQUIRED VARIABLES.');
    console.error('Please check your Vercel project settings and update .env.local.');
} else {
    console.log('\nResult: All required variables seem to be present.');
}
