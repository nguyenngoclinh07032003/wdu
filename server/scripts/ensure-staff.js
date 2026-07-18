/**
 * Tạo hoặc cập nhật tài khoản staff demo (local).
 * Usage: node scripts/ensure-staff.js [email] [password]
 */
require('../src/Config/loadEnv');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const ModelUser = require('../src/models/ModelUser');

const email = String(process.argv[2] || 'staff@healthcare.local')
    .trim()
    .toLowerCase();
const password = process.argv[3] || 'Staff@123456';

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const hash = await bcrypt.hash(password, 10);

    let user = await ModelUser.findOne({ email });
    if (user) {
        user.role = 'staff';
        user.isAdmin = false;
        user.isActive = true;
        user.password = hash;
        await user.save();
        console.log(`Updated existing user to staff: ${email}`);
    } else {
        user = await ModelUser.create({
            fullname: 'Nhân viên CSKH',
            email,
            password: hash,
            phone: 900000001,
            role: 'staff',
            isAdmin: false,
            isActive: true,
            isGoogleAccount: false,
            isFacebookAccount: false,
        });
        console.log(`Created staff user: ${email}`);
    }

    console.log(`Password: ${password}`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
