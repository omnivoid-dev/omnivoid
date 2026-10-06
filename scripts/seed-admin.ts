/**
 * OMNIVOID LABS - Admin User Seed Script (Supabase Auth)
 * 
 * Usage: npx tsx scripts/seed-admin.ts <email> <password>
 */

import { createAdminClient } from '../src/lib/supabase/admin';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('🌱 Seeding Supabase admin user...');

  const args = process.argv.slice(2);
  const email = args[0] || process.env.ADMIN_EMAIL || 'admin@omnivoidlabs.com';
  const password = args[1] || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ Error: Password is required as argument or ADMIN_PASSWORD env var');
    console.log('Usage: npx tsx scripts/seed-admin.ts admin@omnivoidlabs.com <password>');
    process.exit(1);
  }

  const supabaseAdmin = createAdminClient();

  // Check if user already exists
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users from Supabase Auth:', listError.message);
    process.exit(1);
  }

  const existingUser = users.find((u) => u.email === email);

  if (existingUser) {
    console.log(`⚠️  User ${email} already exists (${existingUser.id}). Updating password and admin role...`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        app_metadata: { role: 'admin' },
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('❌ Error updating user:', updateError.message);
      process.exit(1);
    }
    console.log(`✅ Admin user ${email} updated successfully!`);
  } else {
    console.log(`Creating new admin user ${email}...`);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'admin' },
    });

    if (createError) {
      console.error('❌ Error creating admin user:', createError.message);
      process.exit(1);
    }
    console.log(`✅ Admin user ${email} created successfully (ID: ${newUser.user.id})!`);
  }

  // Create default site settings if they don't exist
  const settings = [
    { key: 'currentEdition', value: null },
    { key: 'siteTitle', value: 'OMNIVOID LABS' },
    { key: 'siteDescription', value: 'A concert series exploring the intersections of sound, art, and technology' }
  ];

  for (const setting of settings) {
    await prisma.siteSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: setting
    });
  }
  console.log('✅ Default site settings verified!');

  console.log('\n🎉 Admin seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });