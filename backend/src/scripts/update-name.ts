import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/users/user.model';

async function updateName() {
  await mongoose.connect(config.MONGODB_URI);
  const result = await User.updateMany(
    { email: 'h.balaji1964@gmail.com' },
    { $set: { name: 'Balaji' } }
  );
  console.log('✅ Updated name to "Balaji" for h.balaji1964@gmail.com:', result);
  await mongoose.disconnect();
}

updateName().catch(console.error);
