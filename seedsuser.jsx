import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

// Load env variables
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("MONGODB_URI is not defined in env!");
    process.exit(1);
}

const seedUsers = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected successfully.");

        const usersToSeed = [

            {
                name: 'Apon Khan',
                email: 'apon@gmail.com',
                password: '12345678',
                role: 'admin',
                mobileNumber: '01812345678',
                department: 'Management',
                status: 'active',
            }
        ];

        for (const userData of usersToSeed) {
            const existingUser = await User.findOne({ email: userData.email });

            if (existingUser) {
                console.log(`User ${userData.email} already exists. Updating password, role, and details...`);
                existingUser.password = userData.password;
                existingUser.role = userData.role;
                existingUser.name = userData.name;
                existingUser.mobileNumber = userData.mobileNumber;
                existingUser.department = userData.department;
                existingUser.status = userData.status;
                await existingUser.save();
                console.log(`User ${userData.email} updated successfully!`);
            } else {
                const newUser = new User(userData);
                await newUser.save();
                console.log(`✅ Success: User Created! Email: ${userData.email}, Role: ${userData.role}`);
            }
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error(`❌ Error seeding users: ${error.message}`);
        process.exit(1);
    }
};

seedUsers();
