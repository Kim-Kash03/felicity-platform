require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const User = require('../models/User');

const check = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/felicity', { family: 4 });
    const users = await User.find({ role: 'admin' });
    console.log('Admins in DB:', users);
    const emailSpecific = await User.findOne({ email: 'admin@felicity.iiit.ac.in' });
    console.log('Email specific check:', emailSpecific);
    process.exit(0);
};

check().catch((err) => {
    console.error('Check failed:', err);
    process.exit(1);
});
