require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seed = async () => {
    await mongoose.connect(process.env.MONGO_URI, { family: 4 });

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@felicity.iiit.ac.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
        console.log('Admin already exists:', existing.email);
        process.exit(0);
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    await User.create({
        email: adminEmail,
        password: hashed,
        role: 'admin',
        isActive: true,
    });

    console.log('Admin seeded successfully!');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    process.exit(0);
};

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
