const path = require('path');
const dotenv = require('dotenv');

const legacySrcEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: legacySrcEnvPath });
dotenv.config({ path: rootEnvPath, override: true });

module.exports = {
    legacySrcEnvPath,
    rootEnvPath,
};