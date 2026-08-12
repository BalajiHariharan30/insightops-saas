import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { User } from '../modules/users/user.model';
import { Organization } from '../modules/organizations/organization.model';
import { OrganizationMember } from '../modules/organizations/member.model';

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('💚 Connected to MongoDB Atlas');

  // Find or create default organization
  let org = await Organization.findOne({ slug: 'insightops-demo' });
  if (!org) {
    org = await Organization.findOne({});
  }
  if (!org) {
    org = new Organization({
      name: 'InsightOps India',
      slug: 'insightops-india',
      timezone: 'Asia/Kolkata',
      isActive: true,
    });
    await org.save();
    console.log('Created organization:', org.name);
  }

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Administrator User: h.balaji1964@gmail.com
  let admin = await User.findOne({ email: 'h.balaji1964@gmail.com' });
  if (!admin) {
    admin = new User({
      name: 'Balaji',
      email: 'h.balaji1964@gmail.com',
      passwordHash,
      isVerified: true,
    });
    await admin.save();
    console.log('✅ Created Admin user: h.balaji1964@gmail.com');
  } else {
    admin.name = 'Balaji';
    admin.passwordHash = passwordHash;
    admin.isVerified = true;
    await admin.save();
    console.log('🔄 Updated Admin user name to Balaji: h.balaji1964@gmail.com');
  }

  // Ensure Admin membership
  await OrganizationMember.findOneAndUpdate(
    { userId: admin._id, organizationId: org._id },
    { role: 'ADMIN', status: 'ACTIVE' },
    { upsert: true, new: true }
  );
  console.log(`✅ Bound Admin [${admin.email}] as ADMIN in organization [${org.name}]`);

  // 2. Customer / Staff User: balaji.bt22@bitsathy.ac.in
  let customer = await User.findOne({ email: 'balaji.bt22@bitsathy.ac.in' });
  if (!customer) {
    customer = new User({
      name: 'Balaji (Customer)',
      email: 'balaji.bt22@bitsathy.ac.in',
      passwordHash,
      isVerified: true,
    });
    await customer.save();
    console.log('✅ Created Customer user: balaji.bt22@bitsathy.ac.in');
  } else {
    customer.passwordHash = passwordHash;
    customer.isVerified = true;
    await customer.save();
    console.log('🔄 Updated Customer user password: balaji.bt22@bitsathy.ac.in');
  }

  // Ensure Customer/Staff membership
  await OrganizationMember.findOneAndUpdate(
    { userId: customer._id, organizationId: org._id },
    { role: 'STAFF', status: 'ACTIVE' },
    { upsert: true, new: true }
  );
  console.log(`✅ Bound Customer [${customer.email}] as STAFF in organization [${org.name}]`);

  console.log('\n🎉 Successfully configured both accounts:');
  console.log('1. Admin:    h.balaji1964@gmail.com    | Password: Password123! | Role: ADMIN');
  console.log('2. Customer: balaji.bt22@bitsathy.ac.in | Password: Password123! | Role: STAFF');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
