const mongoose = require('mongoose');
require('./loadEnv');

mongoose.set('strictQuery', false);

const dropLegacyPhoneUniqueIndex = async () => {
    try {
        const collection = mongoose.connection.collection('shoe.users');
        const indexes = await collection.indexes();

        const phoneUniqueIndex = indexes.find(
            (index) =>
                index.key?.phone === 1 &&
                index.unique === true &&
                Object.keys(index.key).length === 1
        );

        if (phoneUniqueIndex) {
            await collection.dropIndex(phoneUniqueIndex.name);
            console.log(`✅ Dropped legacy unique index on phone: ${phoneUniqueIndex.name}`);
        }
    } catch (error) {
        if (error?.codeName !== 'IndexNotFound') {
            console.warn('⚠️ Could not drop phone unique index:', error.message);
        }
    }
};

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });

        await dropLegacyPhoneUniqueIndex();

        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
