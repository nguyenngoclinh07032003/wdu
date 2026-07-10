/**
 * Gán role doctor cho user theo email.
 * Usage: node scripts/promote-doctor.js user@example.com
 */
require('../src/Config/loadEnv');
const mongoose = require('mongoose');
const ModelUser = require('../src/models/ModelUser');

const email = process.argv[2];

if (!email) {
    console.error('Usage: node scripts/promote-doctor.js <email>');
    process.exit(1);
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await ModelUser.findOneAndUpdate(
        { email: email.trim().toLowerCase() },
        { role: 'doctor', isAdmin: false },
        { new: true }
    );

    if (!user) {
        console.error(`Không tìm thấy user với email: ${email}`);
        process.exit(1);
    }

    console.log(`Đã gán role doctor cho: ${user.email} (${user.fullname || 'N/A'})`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
