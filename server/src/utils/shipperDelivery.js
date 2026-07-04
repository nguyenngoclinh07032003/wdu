const ModelPayment = require('../models/ModelPayment');

const ACTIVE_SHIPPER_ORDER_STATUSES = ['confirmed', 'shipping', 'failed', 'returning'];

async function countActiveDeliveries(shipperId) {
    if (!shipperId) return 0;

    return ModelPayment.countDocuments({
        shipperId,
        status: { $in: ACTIVE_SHIPPER_ORDER_STATUSES },
    });
}

async function hasActiveDelivery(shipperId) {
    const count = await countActiveDeliveries(shipperId);
    return count > 0;
}

async function getActiveDeliveryCountMap(shipperIds = []) {
    if (!shipperIds.length) return {};

    const rows = await ModelPayment.aggregate([
        {
            $match: {
                shipperId: { $in: shipperIds },
                status: { $in: ACTIVE_SHIPPER_ORDER_STATUSES },
            },
        },
        {
            $group: {
                _id: '$shipperId',
                count: { $sum: 1 },
            },
        },
    ]);

    return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

module.exports = {
    ACTIVE_SHIPPER_ORDER_STATUSES,
    countActiveDeliveries,
    hasActiveDelivery,
    getActiveDeliveryCountMap,
};
