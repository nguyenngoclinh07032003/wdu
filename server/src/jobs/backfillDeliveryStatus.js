const ModelPayment = require('../models/ModelPayment');
const {
    inferDeliveryStatusFromLegacy,
    applyInferredDeliveryFields,
} = require('../utils/deliveryStatus');

/**
 * One-shot backfill of deliveryStatus for legacy orders that already have a shipper.
 */
async function backfillDeliveryStatuses() {
    const cursor = ModelPayment.find({
        shipperId: { $ne: null },
        $or: [{ deliveryStatus: { $exists: false } }, { deliveryStatus: null }],
    }).cursor();

    let migrated = 0;

    for await (const order of cursor) {
        const inferred = inferDeliveryStatusFromLegacy(order);
        if (!inferred) continue;

        applyInferredDeliveryFields(order, inferred);
        await order.save();
        migrated += 1;
    }

    if (migrated > 0) {
        console.log(`✓ Backfilled deliveryStatus on ${migrated} order(s)`);
    }

    return migrated;
}

module.exports = backfillDeliveryStatuses;
