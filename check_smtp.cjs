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

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_SERVICE_ROLE_KEY']);

async function checkSettings() {
    console.log("Checking system_settings...");
    const { data, error } = await supabase.from('system_settings').select('*');
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Found settings:", data.length);
        if (data.length > 0) {
            const s = data[0];
            console.log("SMTP Host:", s.smtp_host || "MISSING");
            console.log("SMTP User:", s.smtp_user || "MISSING");
            console.log("SMTP Port:", s.smtp_port || "MISSING");
            // Do NOT log the password
            console.log("SMTP Pass Set:", !!s.smtp_pass);
        } else {
            console.log("No settings found in table.");
        }
    }
}

checkSettings();
