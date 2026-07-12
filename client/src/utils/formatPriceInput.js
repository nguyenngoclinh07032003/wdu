export const formatPriceWithCommas = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';

    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const parsePriceInput = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits ? Number(digits) : 0;
};
