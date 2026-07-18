/**
 * Ownership of orders must use account identity only (userId / account email in `user`).
 * Never match the shipping contact `email` field — that caused cross-account IDOR.
 */
function normalizeEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

function buildOwnedOrderFilter(user) {
    const id = user?.id || user?._id;
    const email = normalizeEmail(user?.email);
    const or = [];

    if (id) {
        or.push({ userId: id });
    }
    if (email) {
        or.push({ user: email });
    }

    if (!or.length) {
        return { _id: null };
    }

    return { $or: or };
}

function isOrderOwnedByUser(order, user) {
    if (!order || !user) return false;

    const id = String(user.id || user._id || '');
    const email = normalizeEmail(user.email);
    const orderUserId = order.userId?._id || order.userId;

    if (id && orderUserId && String(orderUserId) === id) {
        return true;
    }

    if (email && normalizeEmail(order.user) === email) {
        return true;
    }

    return false;
}

module.exports = {
    normalizeEmail,
    buildOwnedOrderFilter,
    isOrderOwnedByUser,
};
