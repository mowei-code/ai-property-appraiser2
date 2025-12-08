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

async function check() {
    console.log("--- Checking 'profiles' table ---");
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

    if (profileError) {
        console.log("Profiles Table Error:", profileError.message);
        if (profileError.code === '42P01') console.log("HINT: Table 'profiles' likely does not exist.");
    } else {
        console.log("Profiles Table Status: OK (Exists)");
    }

    console.log("\n--- Checking Admin Login (SignIn) ---");
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'admin@mazylab.com',
        password: 'admin1234'
    });

    if (loginError) {
        console.log("Login Failed:", loginError.message);
    } else {
        console.log("Login Success!");
        console.log("User ID:", loginData.user.id);
    }
}

check();
