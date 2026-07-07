/**
 * Sao chép toàn bộ collection MongoDB từ dự án HealthCare sang WDU.
 *
 * Cách dùng:
 *   set SOURCE_MONGODB_URI=mongodb://127.0.0.1:27017/ten-db-cu
 *   set TARGET_MONGODB_URI=mongodb://127.0.0.1:27017/healthcare
 *   node scripts/migrate-mongodb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { MongoClient } = require('mongodb');

const SOURCE_URI =
    process.env.SOURCE_MONGODB_URI ||
    process.env.HEALTHCARE_MONGODB_URI ||
    process.env.MONGODB_URI_SOURCE;
const TARGET_URI =
    process.env.TARGET_MONGODB_URI ||
    process.env.WDU_MONGODB_URI ||
    process.env.MONGODB_URI;

if (!SOURCE_URI || !TARGET_URI) {
    console.error(
        'Thiếu biến môi trường. Cần SOURCE_MONGODB_URI và TARGET_MONGODB_URI (hoặc WDU_MONGODB_URI).',
    );
    process.exit(1);
}

if (SOURCE_URI === TARGET_URI) {
    console.error('SOURCE và TARGET không được trùng nhau.');
    process.exit(1);
}

async function migrate() {
    const sourceClient = new MongoClient(SOURCE_URI);
    const targetClient = new MongoClient(TARGET_URI);

    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db();
    const targetDb = targetClient.db();

    const collections = await sourceDb.listCollections().toArray();

    if (!collections.length) {
        console.warn(`Không có collection nào trong DB nguồn: ${sourceDb.databaseName}`);
        await sourceClient.close();
        await targetClient.close();
        return;
    }

    console.log(`Nguồn: ${sourceDb.databaseName} → Đích: ${targetDb.databaseName}`);
    console.log(`Số collection: ${collections.length}`);

    for (const { name } of collections) {
        const docs = await sourceDb.collection(name).find({}).toArray();

        await targetDb.collection(name).deleteMany({});

        if (docs.length) {
            await targetDb.collection(name).insertMany(docs, { ordered: false });
        }

        console.log(`  ✓ ${name}: ${docs.length} bản ghi`);
    }

    await sourceClient.close();
    await targetClient.close();
    console.log('Hoàn tất migrate MongoDB.');
}

migrate().catch((error) => {
    console.error('Lỗi migrate:', error.message);
    process.exit(1);
});
