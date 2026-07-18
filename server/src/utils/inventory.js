const ModelProducts = require('../models/ModelProducts');

const LEGACY_DEFAULT_STOCK = 999;

async function ensureStockField(filter) {
    await ModelProducts.updateOne({ ...filter, stock: { $exists: false } }, { $set: { stock: LEGACY_DEFAULT_STOCK } });
}

/**
 * Trừ tồn kho theo dòng đơn. Rollback nếu một dòng thất bại.
 * @returns {Array<{productId, quantity, nameProduct}>}
 */
async function reserveStockForProducts(products = []) {
    const reserved = [];

    try {
        for (const line of products) {
            const qty = Number(line.quantity) || 0;
            if (qty <= 0) continue;

            const nameProduct = line.nameProduct || line.name || '';
            let filter = null;

            if (line.productId) {
                filter = { _id: line.productId };
            } else if (nameProduct) {
                filter = { name: String(nameProduct).trim() };
            } else {
                continue;
            }

            await ensureStockField(filter);

            const updated = await ModelProducts.findOneAndUpdate(
                { ...filter, stock: { $gte: qty } },
                { $inc: { stock: -qty } },
                { new: true },
            );

            if (!updated) {
                const err = new Error(`Không đủ tồn kho cho sản phẩm: ${nameProduct || 'unknown'}`);
                err.statusCode = 400;
                throw err;
            }

            reserved.push({
                productId: updated._id,
                quantity: qty,
                nameProduct: updated.name || nameProduct,
            });
        }

        return reserved;
    } catch (error) {
        if (reserved.length) {
            await releaseStockReservations(reserved);
        }
        throw error;
    }
}

async function releaseStockReservations(reservations = []) {
    await Promise.all(
        (reservations || []).map(async (item) => {
            const qty = Number(item.quantity) || 0;
            if (qty <= 0) return;
            if (item.productId) {
                await ModelProducts.updateOne({ _id: item.productId }, { $inc: { stock: qty } });
                return;
            }
            if (item.nameProduct) {
                await ModelProducts.updateOne({ name: item.nameProduct }, { $inc: { stock: qty } });
            }
        }),
    );
}

async function releaseStockForOrder(order) {
    if (!order || order.stockReleased) return;
    const lines = (order.products || []).map((p) => ({
        productId: p.productId,
        quantity: p.quantity,
        nameProduct: p.nameProduct,
    }));
    await releaseStockReservations(lines);
    order.stockReleased = true;
}

module.exports = {
    LEGACY_DEFAULT_STOCK,
    reserveStockForProducts,
    releaseStockReservations,
    releaseStockForOrder,
};
