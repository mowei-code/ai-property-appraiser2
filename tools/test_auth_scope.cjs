const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function testAuth() {
    console.log("--- Test 1: Login Non-existent User ---");
    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'definitelynotreal_' + Date.now() + '@example.com',
        password: 'password123'
    });
    console.log("Result:", loginError ? loginError.message : "Success (Unexpected!)");

    console.log("\n--- Test 2: SignUp New User ---");
    const newEmail = 'testuser_' + Date.now() + '@example.com';
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: 'password123',
        options: { data: { name: 'Test User' } }
    });

    if (signUpError) {
        console.log("SignUp Failed:", signUpError.message);
    } else {
        console.log("SignUp Success!");
        console.log("User ID:", signUpData.user ? signUpData.user.id : "No User Object");
    }
}

testAuth();
