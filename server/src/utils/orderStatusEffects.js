const ModelProducts = require('../models/ModelProducts');

async function incrementProductSoldOnCompletion(order) {
    await Promise.all(
        (order.products || []).map(async (product) => {
            const quantity = Number(product.quantity) || 0;
            if (quantity <= 0) return;

            const productId = product.productId || product._id;

            if (productId) {
                const result = await ModelProducts.updateOne(
                    { _id: productId },
                    {
                        $inc: {
                            sold: quantity,
                        },
                    },
                );

                if (result.modifiedCount > 0) return;
            }

            await ModelProducts.updateOne(
                {
                    name: product.nameProduct,
                },
                {
                    $inc: {
                        sold: quantity,
                    },
                },
            );
        }),
    );
}

async function applyOrderStatusSideEffects(order, previousStatus, nextStatus) {
    const normalizedPrevious = String(previousStatus || '')
        .trim()
        .toLowerCase();
    const normalizedNext = String(nextStatus || '')
        .trim()
        .toLowerCase();

    order.status = normalizedNext;
    order.updatedAt = new Date();

    if (normalizedNext === 'completed') {
        order.deliveredAt = new Date();

        if (
            String(order.paymentMethod || '')
                .trim()
                .toUpperCase() === 'COD'
        ) {
            order.paymentStatus = 'paid';
        }
    }

    if (normalizedNext === 'failed') {
        order.failedAt = new Date();
    }

    if (normalizedNext === 'returning') {
        order.returningAt = new Date();
    }

    if (normalizedNext === 'returned') {
        order.returnedAt = new Date();
    }

    await order.save();

    if (normalizedPrevious !== 'completed' && normalizedNext === 'completed') {
        await incrementProductSoldOnCompletion(order);
    }

    return order;
}

module.exports = {
    applyOrderStatusSideEffects,
};
