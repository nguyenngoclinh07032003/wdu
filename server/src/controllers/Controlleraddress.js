const Address = require('../models/ModelAddress');

const isValidVietnamPhone = (phone) => {
    return /^(0|\+84)[0-9]{9}$/.test(String(phone || '').trim());
};

const normalizeLocationNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
};

const createAddress = async (req, res) => {
    try {
        const { fullName, phone, province, district, ward, detail, isDefault, lat, lng, mapAddress } = req.body;

        if (!fullName || !phone || !province || !ward || !detail) {
            return res.status(400).json({
                message: 'Vui lòng nhập đầy đủ họ tên, số điện thoại, tỉnh/thành, phường/xã và địa chỉ chi tiết',
            });
        }

        if (!isValidVietnamPhone(phone)) {
            return res.status(400).json({
                message: 'Số điện thoại không hợp lệ. Ví dụ đúng: 0912345678 hoặc +84912345678',
            });
        }

        const addressCount = await Address.countDocuments({ user: req.user.id });
        const shouldSetDefault = addressCount === 0 || !!isDefault;

        if (shouldSetDefault) {
            await Address.updateMany({ user: req.user.id }, { $set: { isDefault: false } });
        }

        const address = await Address.create({
            user: req.user.id,
            fullName: String(fullName).trim(),
            phone: String(phone).trim(),
            province: String(province).trim(),
            district: district ? String(district).trim() : '',
            ward: String(ward).trim(),
            detail: String(detail).trim(),

            lat: normalizeLocationNumber(lat),
            lng: normalizeLocationNumber(lng),
            mapAddress: mapAddress ? String(mapAddress).trim() : '',

            isDefault: shouldSetDefault,
        });

        return res.status(201).json(address);
    } catch (error) {
        console.log('createAddress error:', error);

        if (error?.name === 'ValidationError') {
            return res.status(400).json({
                message: Object.values(error.errors)?.[0]?.message || 'Dữ liệu địa chỉ không hợp lệ',
            });
        }

        return res.status(500).json({ message: 'Lỗi server khi tạo địa chỉ' });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, phone, province, district, ward, detail, isDefault, lat, lng, mapAddress } = req.body;

        if (!fullName || !phone || !province || !ward || !detail) {
            return res.status(400).json({
                message: 'Vui lòng nhập đầy đủ họ tên, số điện thoại, tỉnh/thành, phường/xã và địa chỉ chi tiết',
            });
        }

        if (!isValidVietnamPhone(phone)) {
            return res.status(400).json({
                message: 'Số điện thoại không hợp lệ. Ví dụ đúng: 0912345678 hoặc +84912345678',
            });
        }

        const address = await Address.findOne({
            _id: id,
            user: req.user.id,
        });

        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        if (isDefault) {
            await Address.updateMany({ user: req.user.id, _id: { $ne: id } }, { $set: { isDefault: false } });
        }

        address.fullName = String(fullName).trim();
        address.phone = String(phone).trim();
        address.province = String(province).trim();
        address.district = district ? String(district).trim() : '';
        address.ward = String(ward).trim();
        address.detail = String(detail).trim();

        address.lat = normalizeLocationNumber(lat);
        address.lng = normalizeLocationNumber(lng);
        address.mapAddress = mapAddress ? String(mapAddress).trim() : '';

        address.isDefault = !!isDefault;

        await address.save();

        return res.status(200).json(address);
    } catch (error) {
        console.log('updateAddress error:', error);

        if (error?.name === 'ValidationError') {
            return res.status(400).json({
                message: Object.values(error.errors)?.[0]?.message || 'Dữ liệu địa chỉ không hợp lệ',
            });
        }

        return res.status(500).json({ message: 'Lỗi server khi cập nhật địa chỉ' });
    }
};

const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id }).sort({
            isDefault: -1,
            createdAt: -1,
        });

        return res.status(200).json(addresses);
    } catch (error) {
        console.log('getAddresses error:', error);
        return res.status(500).json({ message: 'Lỗi server khi lấy danh sách địa chỉ' });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;

        const address = await Address.findOne({
            _id: id,
            user: req.user.id,
        });

        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        const wasDefault = address.isDefault;

        await address.deleteOne();

        if (wasDefault) {
            const newestAddress = await Address.findOne({ user: req.user.id }).sort({ createdAt: -1 });

            if (newestAddress) {
                newestAddress.isDefault = true;
                await newestAddress.save();
            }
        }

        return res.status(200).json({ message: 'Xóa địa chỉ thành công' });
    } catch (error) {
        console.log('deleteAddress error:', error);
        return res.status(500).json({ message: 'Lỗi server khi xóa địa chỉ' });
    }
};

const setDefaultAddress = async (req, res) => {
    try {
        const { id } = req.params;

        const address = await Address.findOne({
            _id: id,
            user: req.user.id,
        });

        if (!address) {
            return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
        }

        await Address.updateMany({ user: req.user.id }, { $set: { isDefault: false } });

        address.isDefault = true;
        await address.save();

        return res.status(200).json({ message: 'Đặt địa chỉ mặc định thành công' });
    } catch (error) {
        console.log('setDefaultAddress error:', error);
        return res.status(500).json({ message: 'Lỗi server khi đặt mặc định' });
    }
};

module.exports = {
    createAddress,
    updateAddress,
    getAddresses,
    deleteAddress,
    setDefaultAddress,
};
