const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const url = env['VITE_SUPABASE_URL'];
const key = env['VITE_SUPABASE_ANON_KEY'];

if (!url || !key) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

// 2. Initialize Client
const supabase = createClient(url, key);

// 3. Attempt generic admin registration
const adminEmail = 'admin@mazylab.com';
const adminPass = 'admin1234';

async function checkAdmin() {
    console.log(`Checking status for ${adminEmail}...`);

    // Attempt SignUp. 
    // If it succeeds -> Account was missing, now created.
    // If it fails (User already registered) -> Account exists.
    const { data, error } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPass,
        options: {
            data: { name: 'System Admin' }
        }
    });

    if (error) {
        console.log("RESULT: EXISTS (or API Error)");
        console.log("Error Message:", error.message);
    } else if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
            console.log("RESULT: EXISTS (Already registered)");
        } else {
            console.log("RESULT: CREATED");
            console.log("Admin account created successfully with password:", adminPass);
        }
    } else {
        console.log("RESULT: UNKNOWN");
        console.log(data);
    }
}

checkAdmin();
