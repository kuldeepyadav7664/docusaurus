require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const uri = process.env.MONGO_URI;

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

const seedUsers = async () => {
  await mongoose.connect(uri);

  const users = [
    { email: 'kuldeep.yadav@appsquadz.co', password: 'kuldeep', role: 'author' },
    { email: 'sarthak.bansal@appsquadz.co', password: 'sarthak', role: 'author' },
    { email: 'sumit.agrawal@appsquadz.co', password: 'sumit', role: 'manager' },
    { email: 'vishal.deep@appsquadz.co', password: 'vishal', role: 'manager' },
  ];

  for (const user of users) {
    const existing = await User.findOne({ email: user.email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await User.create({ ...user, password: hashedPassword });
      console.log(`✅ Created ${user.email}`);
    } else {
      console.log(`⚠️  ${user.email} already exists`);
    }
  }

  await mongoose.disconnect();
};

seedUsers()
  .then(() => console.log('✅ All done'))
  .catch(err => console.error('❌ Error:', err));

