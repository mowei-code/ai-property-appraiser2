const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env vars
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

console.log("Loaded keys:", Object.keys(env));

const sbUrl = env['VITE_SUPABASE_URL'];
const serviceRoleKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

if (!sbUrl || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const adminClient = createClient(sbUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function verifyAdminCapability() {
    console.log("--- Verifying Admin Password Update Capability ---");

    // 1. Create a dummy user
    const testEmail = `test_pwd_update_${Date.now()}@example.com`;
    const initialPwd = 'password123';
    console.log(`Creating test user: ${testEmail}`);

    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
        email: testEmail,
        password: initialPwd,
        email_confirm: true
    });

    if (createError) {
        console.error("Failed to create test user:", createError.message);
        return;
    }

    const userId = userData.user.id;
    console.log(`User created. ID: ${userId}`);

    // 2. Update password
    const newPwd = 'newpassword456';
    console.log(`Updating password to: ${newPwd}`);

    const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: newPwd
    });

    if (updateError) {
        console.error("Failed to update password:", updateError.message);
    } else {
        console.log("Password update successful!");
    }

    // 3. Cleanup
    console.log("Cleaning up test user...");
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
        console.error("Failed to delete test user:", deleteError.message);
    } else {
        console.log("Test user deleted.");
    }
}

verifyAdminCapability();
