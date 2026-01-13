require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists');
            console.log(`   Email: ${existingAdmin.email}`);
            console.log(`   Role: ${existingAdmin.role}`);
        } else {
            // Create admin user
            const admin = await User.create({
                name: 'Admin',
                email: process.env.ADMIN_EMAIL,
                password: process.env.ADMIN_PASSWORD,
                role: 'admin'
            });

            console.log('✅ Admin user created successfully');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
            console.log(`   Role: ${admin.role}`);
        }

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();
