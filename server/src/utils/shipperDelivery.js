const ModelPayment = require('../models/ModelPayment');

const ACTIVE_SHIPPER_ORDER_STATUSES = [
    'confirmed',
    'picking',
    'shipping',
    'failed',
    'returning',
];

const ACTIVE_DELIVERY_STATUSES = [
    'ASSIGNED',
    'ACCEPTED',
    'DELIVERING',
    'FIRST_DELIVERY_FAILED',
    'REDELIVERING',
    'RETURNING',
];

async function countActiveDeliveries(shipperId) {
    if (!shipperId) return 0;

    return ModelPayment.countDocuments({
        shipperId,
        $or: [
            { deliveryStatus: { $in: ACTIVE_DELIVERY_STATUSES } },
            {
                deliveryStatus: { $exists: false },
                status: { $in: ACTIVE_SHIPPER_ORDER_STATUSES },
            },
        ],
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
                $or: [
                    { deliveryStatus: { $in: ACTIVE_DELIVERY_STATUSES } },
                    {
                        deliveryStatus: { $exists: false },
                        status: { $in: ACTIVE_SHIPPER_ORDER_STATUSES },
                    },
                ],
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
    ACTIVE_DELIVERY_STATUSES,
    countActiveDeliveries,
    hasActiveDelivery,
    getActiveDeliveryCountMap,
};
