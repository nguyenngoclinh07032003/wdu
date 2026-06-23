import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import classNames from 'classnames/bind';
import styles from '../../Styles/InfoUser.module.scss';

import {
    getAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} from '../../services/addressService';

const cx = classNames.bind(styles);

function AddressBook() {
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [tinhThanh, setTinhThanh] = useState([]);
    const [xa, setXa] = useState([]);

    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        fullname: '',
        phone: '',
        provinceId: '',
        provinceName: '',
        wardId: '',
        wardName: '',
        detail: '',
        isDefault: false,
        lat: null,
        lng: null,
        mapAddress: '',
    });

    // ================= MAP =================
    const mapPreviewSrc = useMemo(() => {
        if (formData.lat && formData.lng) {
            return `https://www.google.com/maps?q=${formData.lat},${formData.lng}&hl=vi&z=17&output=embed`;
        }

        if (formData.mapAddress) {
            return `https://www.google.com/maps?q=${encodeURIComponent(formData.mapAddress)}&hl=vi&z=17&output=embed`;
        }

        return '';
    }, [formData.lat, formData.lng, formData.mapAddress]);

    // ================= INIT =================
    useEffect(() => {
        fetchAddresses();
        fetchProvinces();
    }, []);

    useEffect(() => {
        if (!formData.provinceId) {
            setXa([]);
            return;
        }

        fetchWardsByProvince(formData.provinceId);
    }, [formData.provinceId]);

    // ================= AUTO BUILD MAP =================
    useEffect(() => {
        if (!formData.provinceName || !formData.wardName) {
            setFormData((prev) => ({
                ...prev,
                mapAddress: '',
            }));
            return;
        }

        const addressText = [formData.detail, formData.wardName, formData.provinceName, 'Việt Nam']
            .filter(Boolean)
            .join(', ');

        setFormData((prev) => ({
            ...prev,
            lat: null,
            lng: null,
            mapAddress: addressText,
        }));
    }, [formData.detail, formData.provinceName, formData.wardName]);

    // ================= API =================
    const fetchAddresses = async () => {
        try {
            setLoading(true);

            const list = await getAddresses();

            setAddresses(Array.isArray(list) ? list : []);
        } catch (error) {
            console.log('fetchAddresses error:', error);
            setAddresses([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProvinces = async () => {
        try {
            const res = await axios.get('https://esgoo.net/api-tinhthanh-new/1/0.htm');

            if (res.data?.error === 0) {
                setTinhThanh(res.data.data || []);
            } else {
                setTinhThanh([]);
            }
        } catch (error) {
            console.log('fetchProvinces error:', error);
            setTinhThanh([]);
        }
    };

    const fetchWardsByProvince = async (provinceId) => {
        try {
            const res = await axios.get(`https://esgoo.net/api-tinhthanh-new/2/${provinceId}.htm`);

            if (res.data?.error === 0) {
                setXa(res.data.data || []);
            } else {
                setXa([]);
            }
        } catch (error) {
            console.log('fetchWardsByProvince error:', error);
            setXa([]);
        }
    };

    // ================= FORM =================
    const resetForm = () => {
        setFormData({
            fullname: '',
            phone: '',
            provinceId: '',
            provinceName: '',
            wardId: '',
            wardName: '',
            detail: '',
            isDefault: false,
            lat: null,
            lng: null,
            mapAddress: '',
        });

        setEditingId(null);
        setXa([]);
    };

    const handleChangeInput = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleChangeProvince = (e) => {
        const selectedId = e.target.value;

        const selected = tinhThanh.find((item) => String(item.id) === String(selectedId));

        setFormData((prev) => ({
            ...prev,
            provinceId: selectedId,
            provinceName: selected?.full_name || '',
            wardId: '',
            wardName: '',
            lat: null,
            lng: null,
            mapAddress: '',
        }));

        setXa([]);
    };

    const handleChangeWard = (e) => {
        const selectedId = e.target.value;

        const selected = xa.find((item) => String(item.id) === String(selectedId));

        setFormData((prev) => ({
            ...prev,
            wardId: selectedId,
            wardName: selected?.full_name || '',
            lat: null,
            lng: null,
        }));
    };

    // láy vị trí hiện tại từ trình duyệt và tự động điền vào form
    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Trình duyệt không hỗ trợ định vị');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                setFormData((prev) => ({
                    ...prev,
                    lat: latitude,
                    lng: longitude,
                    mapAddress: `${latitude},${longitude}`,
                }));

                alert('Lấy vị trí thành công');
            },

            (error) => {
                console.log('GPS ERROR:', error);

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        alert('Bạn đã từ chối quyền vị trí. Hãy cho phép Location trên trình duyệt.');
                        break;

                    case error.POSITION_UNAVAILABLE:
                        alert('Không thể xác định vị trí hiện tại.');
                        break;

                    case error.TIMEOUT:
                        alert('Lấy vị trí quá lâu. Hãy thử lại.');
                        break;

                    default:
                        alert('Không thể lấy vị trí hiện tại');
                        break;
                }
            },

            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
            },
        );
    };

    // lấy dữ liệu từ form và gọi API tạo mới hoặc cập nhật địa chỉ
    const isValidVietnamPhone = (phone) => {
        return /^(0|\+84)[0-9]{9}$/.test(String(phone || '').trim());
    };

    const validateForm = () => {
        if (!formData.fullname.trim()) {
            alert('Vui lòng nhập họ tên');
            return false;
        }

        if (!formData.phone.trim()) {
            alert('Vui lòng nhập số điện thoại');
            return false;
        }

        if (!isValidVietnamPhone(formData.phone)) {
            alert('Số điện thoại không hợp lệ');
            return false;
        }

        if (!formData.provinceName) {
            alert('Vui lòng chọn Tỉnh/Thành phố');
            return false;
        }

        if (!formData.wardName) {
            alert('Vui lòng chọn Phường/Xã');
            return false;
        }

        if (!formData.detail.trim()) {
            alert('Vui lòng nhập địa chỉ chi tiết');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const payload = {
            fullName: formData.fullname.trim(),
            phone: formData.phone.trim(),
            province: formData.provinceName,
            district: '',
            ward: formData.wardName,
            detail: formData.detail.trim(),
            isDefault: formData.isDefault,
            lat: formData.lat,
            lng: formData.lng,
            mapAddress: formData.mapAddress,
        };

        try {
            setSubmitting(true);

            if (editingId) {
                await updateAddress(editingId, payload);
                alert('Cập nhật địa chỉ thành công');
            } else {
                await createAddress(payload);
                alert('Thêm địa chỉ thành công');
            }

            await fetchAddresses();

            resetForm();
        } catch (error) {
            console.log(error);
            alert(error?.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    // ================= EDIT =================
    const handleEdit = (item) => {
        setEditingId(item._id || item.id);

        setFormData({
            fullname: item.fullName || '',
            phone: item.phone || '',
            provinceId: '',
            provinceName: item.province || '',
            wardId: '',
            wardName: item.ward || '',
            detail: item.detail || '',
            isDefault: item.isDefault || false,
            lat: item.lat || null,
            lng: item.lng || null,
            mapAddress:
                item.mapAddress || [item.detail, item.ward, item.province, 'Việt Nam'].filter(Boolean).join(', '),
        });

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    // ================= DELETE =================
    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này không?')) return;

        try {
            await deleteAddress(id);

            await fetchAddresses();

            alert('Xóa địa chỉ thành công');
        } catch (error) {
            console.log(error);
            alert(error?.response?.data?.message || 'Xóa thất bại');
        }
    };

    // ================= DEFAULT =================
    const handleSetDefault = async (id) => {
        try {
            await setDefaultAddress(id);

            await fetchAddresses();

            alert('Đặt mặc định thành công');
        } catch (error) {
            console.log(error);
            alert(error?.response?.data?.message || 'Thiết lập thất bại');
        }
    };

    return (
        <div className={cx('addressWrapper')}>
            {/* HEADER */}
            <div className={cx('addressHeader')}>
                <div>
                    <h2 className={cx('addressTitle')}>Sổ địa chỉ</h2>

                    <p className={cx('addressSubTitle')}>Quản lý địa chỉ giao hàng của bạn</p>
                </div>

                <button type="button" className={cx('addAddressBtn')} onClick={resetForm}>
                    + Thêm địa chỉ mới
                </button>
            </div>

            {/* FORM */}
            <form className={cx('addressForm')} onSubmit={handleSubmit}>
                <h3 className={cx('addressFormTitle')}>{editingId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>

                <div className={cx('addressFormRow')}>
                    <div className={cx('addressField')}>
                        <label>Họ và tên</label>

                        <input
                            type="text"
                            name="fullname"
                            placeholder="Nhập họ tên"
                            value={formData.fullname}
                            onChange={handleChangeInput}
                        />
                    </div>

                    <div className={cx('addressField')}>
                        <label>Số điện thoại</label>

                        <input
                            type="text"
                            name="phone"
                            placeholder="Nhập số điện thoại"
                            value={formData.phone}
                            onChange={handleChangeInput}
                        />
                    </div>
                </div>

                <div className={cx('addressFormRow')}>
                    <div className={cx('addressField')}>
                        <label>Tỉnh / Thành phố</label>

                        <select value={formData.provinceId} onChange={handleChangeProvince}>
                            <option value="">{formData.provinceName || 'Chọn Tỉnh / Thành phố'}</option>

                            {tinhThanh.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={cx('addressField')}>
                        <label>Phường / Xã</label>

                        <select value={formData.wardId} onChange={handleChangeWard} disabled={!formData.provinceId}>
                            <option value="">{formData.wardName || 'Chọn Phường / Xã'}</option>

                            {xa.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.full_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={cx('addressField')}>
                    <label>Địa chỉ chi tiết</label>

                    <textarea
                        name="detail"
                        placeholder="Số nhà, tên đường..."
                        value={formData.detail}
                        onChange={handleChangeInput}
                    />
                </div>

                {/* MAP */}
                <div className={cx('addressField')}>
                    <label>Google Map</label>

                    <div className={cx('mapActions')}>
                        <button type="button" className={cx('mapBtn')} onClick={handleGetCurrentLocation}>
                            Lấy vị trí hiện tại
                        </button>
                    </div>

                    {mapPreviewSrc ? (
                        <div className={cx('mapPreview')}>
                            <iframe
                                title="Google Map"
                                width="100%"
                                height="260"
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={mapPreviewSrc}
                            />

                            <p>
                                {formData.lat && formData.lng
                                    ? `Tọa độ: ${formData.lat}, ${formData.lng}`
                                    : `Địa chỉ map: ${formData.mapAddress}`}
                            </p>
                        </div>
                    ) : (
                        <p className={cx('mapHint')}>Chọn địa chỉ để tự động hiển thị map</p>
                    )}
                </div>

                <label className={cx('defaultCheckbox')}>
                    <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChangeInput} />

                    <span>Đặt làm địa chỉ mặc định</span>
                </label>

                <div className={cx('addressFormActions')}>
                    <button type="button" className={cx('cancelBtn')} onClick={resetForm}>
                        Hủy bỏ
                    </button>

                    <button type="submit" className={cx('saveBtn')} disabled={submitting}>
                        {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ'}
                    </button>
                </div>
            </form>

            {/* LIST */}
            <div className={cx('addressList')}>
                {loading ? (
                    <p>Đang tải địa chỉ...</p>
                ) : addresses.length === 0 ? (
                    <div className={cx('emptyContent')}>Chưa có địa chỉ nào</div>
                ) : (
                    addresses.map((item) => {
                        const id = item._id || item.id;

                        const itemMapSrc =
                            item.lat && item.lng
                                ? `https://www.google.com/maps?q=${item.lat},${item.lng}&hl=vi&z=16&output=embed`
                                : item.mapAddress
                                  ? `https://www.google.com/maps?q=${encodeURIComponent(
                                        item.mapAddress,
                                    )}&hl=vi&z=16&output=embed`
                                  : '';

                        return (
                            <div
                                key={id}
                                className={cx('addressCard', {
                                    defaultCard: item.isDefault,
                                })}
                            >
                                <div className={cx('addressCardTop')}>
                                    <div className={cx('addressUserInfo')}>
                                        <h4>{item.fullName}</h4>

                                        {item.isDefault && <span className={cx('defaultBadge')}>MẶC ĐỊNH</span>}
                                    </div>

                                    <div className={cx('addressActions')}>
                                        <button type="button" onClick={() => handleEdit(item)}>
                                            Chỉnh sửa
                                        </button>

                                        <button type="button" onClick={() => handleDelete(id)}>
                                            Xóa
                                        </button>
                                    </div>
                                </div>

                                <p className={cx('addressPhone')}>{item.phone}</p>

                                <p className={cx('addressText')}>
                                    {item.detail}, {item.ward}, {item.province}
                                </p>

                                {itemMapSrc && (
                                    <div className={cx('addressMapSmall')}>
                                        <iframe
                                            title="Address Map"
                                            width="100%"
                                            height="180"
                                            loading="lazy"
                                            src={itemMapSrc}
                                        />
                                    </div>
                                )}

                                {!item.isDefault && (
                                    <button
                                        type="button"
                                        className={cx('setDefaultBtn')}
                                        onClick={() => handleSetDefault(id)}
                                    >
                                        Thiết lập mặc định
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default AddressBook;
