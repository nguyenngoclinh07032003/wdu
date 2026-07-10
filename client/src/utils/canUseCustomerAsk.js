export function canUseCustomerAsk(user) {
    if (!user?._id) return false;

    const role = user?.role;
    if (role === 'doctor' || role === 'staff' || role === 'shipper') {
        return false;
    }

    return role === 'user' || role === 'admin' || user?.isAdmin === true;
}
