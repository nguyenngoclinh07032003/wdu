// ManageVoucher.js

import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/ManageVoucher.module.scss';
import request from '../Config/api';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass,
    faPlus,
    faPen,
    faTrash,
    faCopy,
    faTicket,
    faMoneyBillWave,
    faHourglassHalf,
    faChartLine,
    faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const cx = classNames.bind(styles);

function ManageVoucher() {
    const [vouchers, setVouchers] = useState([]);
    const [searchValue, setSearchValue] = useState('');
    const [filter, setFilter] = useState('all');

    const [showForm, setShowForm] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);

    const [form, setForm] = useState({
        title: '',
        code: '',
        category: 'device',
        type: 'percent',
        value: '',
        minOrder: '',
        maxDiscount: '',
        quantity: '',
        endDate: '',
        description: '',
        isActive: true,
    });

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString('vi-VN') + 'đ';
    };

    const fetchVouchers = async () => {
        try {
            const res = await request.get('/api/admin/vouchers');
            setVouchers(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error('Không thể tải danh sách voucher');
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const resetForm = () => {
        setForm({
            title: '',
            code: '',
            category: 'device',
            type: 'percent',
            value: '',
            minOrder: '',
            maxDiscount: '',
            quantity: '',
            endDate: '',
            description: '',
            isActive: true,
        });

        setEditingVoucher(null);
    };

    const getVoucherStatus = (voucher) => {
        const expiryEnd = new Date(voucher.expiredAt);
        expiryEnd.setHours(23, 59, 59, 999);

        if (new Date() > expiryEnd) return 'expired';

        const quantity = Number(voucher.quantity || 0);
        const used = Number(voucher.used || 0);

        if (quantity !== 0 && used >= quantity) return 'depleted';

        if (!voucher.isActive) return 'inactive';

        return 'active';
    };

    const isVoucherOutOfStock = (voucher) => getVoucherStatus(voucher) === 'depleted';

    const filteredVouchers = useMemo(() => {
        return vouchers.filter((voucher) => {
            const keyword = searchValue.trim().toLowerCase();

            const matchSearch =
                voucher.code?.toLowerCase().includes(keyword) || voucher.title?.toLowerCase().includes(keyword);

            const matchFilter = filter === 'all' || getVoucherStatus(voucher) === filter;

            return matchSearch && matchFilter;
        });
    }, [vouchers, searchValue, filter]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const validateSubmit = () => {
        if (!form.title.trim() || !form.code.trim() || !form.value || !form.quantity || !form.endDate) {
            toast.warning('Vui lòng nhập đầy đủ thông tin');
            return false;
        }

        if (Number(form.value) <= 0) {
            toast.warning('Giá trị giảm phải lớn hơn 0');
            return false;
        }

        if (form.type === 'percent' && Number(form.value) > 100) {
            toast.warning('Voucher phần trăm không vượt quá 100%');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateSubmit()) return;

        try {
            const payload = {
                title: form.title.trim(),
                code: form.code.trim().toUpperCase(),
                category: form.category,
                discountType: form.type === 'fixed' ? 'money' : 'percent',
                discountValue: Number(form.value),
                minOrderValue: Number(form.minOrder || 0),
                maxDiscount: Number(form.maxDiscount || 0),
                quantity: Number(form.quantity),
                expiredAt: form.endDate,
                description: form.description,
                isActive: form.isActive,
            };

            if (editingVoucher) {
                await request.put(`/api/admin/vouchers/${editingVoucher._id}`, payload);

                toast.success('Cập nhật voucher thành công');
            } else {
                await request.post('/api/admin/vouchers', payload);

                toast.success('Tạo voucher thành công');
            }

            fetchVouchers();
            setShowForm(false);
            resetForm();
        } catch (error) {
            console.log(error.response?.data);

            toast.error(error.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const handleEdit = (voucher) => {
        setEditingVoucher(voucher);

        setForm({
            title: voucher.title || '',
            code: voucher.code || '',
            category: voucher.category || 'device',
            type: voucher.discountType === 'money' ? 'fixed' : 'percent',
            value: voucher.discountValue || '',
            minOrder: voucher.minOrderValue || '',
            maxDiscount: voucher.maxDiscount || '',
            quantity: voucher.quantity || '',
            endDate: voucher.expiredAt?.slice(0, 10) || '',
            description: voucher.description || '',
            isActive: voucher.isActive ?? true,
        });

        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc muốn xóa voucher?')) return;

        try {
            await request.delete(`/api/admin/vouchers/${id}`);

            toast.success('Đã xóa voucher');

            fetchVouchers();
        } catch (error) {
            toast.error('Xóa voucher thất bại');
        }
    };

    const handleToggleActive = async (voucher) => {
        const status = getVoucherStatus(voucher);

        if (status === 'expired' && !voucher.isActive) {
            toast.warning('Voucher đã hết hạn, không thể bật lại');
            return;
        }

        if (!voucher.isActive && isVoucherOutOfStock(voucher)) {
            toast.warning('Voucher đã hết lượt, hãy tăng số lượng trước khi bật lại');
            return;
        }

        try {
            await request.put(`/api/admin/vouchers/${voucher._id}`, {
                isActive: !voucher.isActive,
            });

            toast.success(voucher.isActive ? 'Đã tắt voucher' : 'Đã bật voucher');
            fetchVouchers();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể đổi trạng thái');
        }
    };

    const handleCopy = async (code) => {
        try {
            await navigator.clipboard.writeText(code);

            toast.success(`Đã copy ${code}`);
        } catch (error) {
            toast.error('Copy thất bại');
        }
    };

    const totalUsedToday = vouchers.reduce((sum, item) => sum + Number(item.usedToday || 0), 0);

    const totalSaved = vouchers.reduce((sum, item) => sum + Number(item.totalSaved || 0), 0);

    const nearlyExpired = vouchers.filter((item) => {
        const end = new Date(item.expiredAt);
        const now = new Date();

        const diffDays = (end - now) / (1000 * 60 * 60 * 24);

        return diffDays >= 0 && diffDays <= 7;
    }).length;

    return (
        <div className={cx('wrapper')}>
            <ToastContainer position="top-right" autoClose={1800} />

            <div className={cx('header')}>
                <div>
                    <h1>Quản lý kho Voucher</h1>

                    <p>Quản lý các chương trình khuyến mãi cho cửa hàng.</p>
                </div>

                <div className={cx('headerActions')}>
                    <div className={cx('searchBox')}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} />

                        <input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Tìm kiếm voucher..."
                        />
                    </div>

                    <button
                        type="button"
                        className={cx('createBtn')}
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Tạo Voucher
                    </button>
                </div>
            </div>

            <div className={cx('card')}>
                <div className={cx('tabs')}>
                    <button
                        className={cx({
                            active: filter === 'all',
                        })}
                        onClick={() => setFilter('all')}
                    >
                        Tất cả
                    </button>

                    <button
                        className={cx({
                            active: filter === 'active',
                        })}
                        onClick={() => setFilter('active')}
                    >
                        Hoạt động
                    </button>

                    <button
                        className={cx({
                            active: filter === 'expired',
                        })}
                        onClick={() => setFilter('expired')}
                    >
                        Hết hạn
                    </button>
                </div>

                <div className={cx('tableWrap')}>
                    <table>
                        <thead>
                            <tr>
                                <th>Mã</th>
                                <th>Tiêu đề</th>
                                <th>Loại</th>
                                <th>Giảm giá</th>
                                <th>Số lượng</th>
                                <th>Hết hạn</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredVouchers.map((voucher) => (
                                <tr key={voucher._id}>
                                    <td>
                                        <strong>{voucher.code}</strong>
                                    </td>

                                    <td>{voucher.title}</td>

                                    <td>{voucher.discountType === 'percent' ? 'Phần trăm' : 'Tiền mặt'}</td>

                                    <td>
                                        {voucher.discountType === 'percent'
                                            ? `${voucher.discountValue}%`
                                            : formatMoney(voucher.discountValue)}
                                    </td>

                                    <td>
                                        {voucher.used}/{voucher.quantity || '∞'}
                                    </td>

                                    <td>{new Date(voucher.expiredAt).toLocaleDateString('vi-VN')}</td>

                                    <td>
                                        <button
                                            type="button"
                                            className={cx('switch', {
                                                on: voucher.isActive,
                                                disabled: getVoucherStatus(voucher) === 'expired',
                                            })}
                                            onClick={() => handleToggleActive(voucher)}
                                            disabled={getVoucherStatus(voucher) === 'expired'}
                                            title={
                                                getVoucherStatus(voucher) === 'expired'
                                                    ? 'Voucher đã hết hạn'
                                                    : isVoucherOutOfStock(voucher) && !voucher.isActive
                                                      ? 'Voucher đã hết lượt, tăng số lượng để bật lại'
                                                      : voucher.isActive
                                                        ? 'Tắt voucher'
                                                        : 'Bật voucher'
                                            }
                                        >
                                            <span />
                                        </button>
                                        {isVoucherOutOfStock(voucher) && (
                                            <small className={cx('statusHint')}>Hết lượt</small>
                                        )}
                                    </td>

                                    <td>
                                        <div className={cx('actions')}>
                                            <button onClick={() => handleEdit(voucher)}>
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </button>

                                            <button onClick={() => handleCopy(voucher.code)}>
                                                <FontAwesomeIcon icon={faCopy} />
                                            </button>

                                            <button onClick={() => handleDelete(voucher._id)}>
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredVouchers.length === 0 && (
                                <tr>
                                    <td colSpan="8" className={cx('empty')}>
                                        Không có voucher
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={cx('stats')}>
                <div className={cx('statCard')}>
                    <div className={cx('statIcon', 'blue')}>
                        <FontAwesomeIcon icon={faChartLine} />
                    </div>

                    <div>
                        <span>Lượt dùng hôm nay</span>

                        <strong>{totalUsedToday} lượt</strong>
                    </div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statIcon', 'green')}>
                        <FontAwesomeIcon icon={faMoneyBillWave} />
                    </div>

                    <div>
                        <span>Tiết kiệm khách hàng</span>

                        <strong>{formatMoney(totalSaved)}</strong>
                    </div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statIcon', 'orange')}>
                        <FontAwesomeIcon icon={faHourglassHalf} />
                    </div>

                    <div>
                        <span>Sắp hết hạn</span>

                        <strong>{nearlyExpired} voucher</strong>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className={cx('modalOverlay')}>
                    <form className={cx('modal')} onSubmit={handleSubmit}>
                        <div className={cx('modalHeader')}>
                            <div>
                                <h2>{editingVoucher ? 'Cập nhật Voucher' : 'Tạo Voucher'}</h2>
                            </div>

                            <button type="button" onClick={() => setShowForm(false)}>
                                ×
                            </button>
                        </div>

                        <div className={cx('formGrid')}>
                            <label>
                                Tiêu đề
                                <input name="title" value={form.title} onChange={handleChange} />
                            </label>

                            <label>
                                Mã voucher
                                <input name="code" value={form.code} onChange={handleChange} />
                            </label>

                            <label>
                                Danh mục
                                <select name="category" value={form.category} onChange={handleChange}>
                                    <option value="shipping">Vận chuyển</option>

                                    <option value="device">Sản phẩm</option>

                                    <option value="test">Test</option>
                                </select>
                            </label>

                            <label>
                                Loại giảm
                                <select name="type" value={form.type} onChange={handleChange}>
                                    <option value="percent">Phần trăm</option>

                                    <option value="fixed">Cố định</option>
                                </select>
                            </label>

                            <label>
                                Giá trị giảm
                                <input
                                    name="value"
                                    type="number"
                                    min="1"
                                    max={form.type === 'percent' ? '100' : undefined}
                                    value={form.value}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        if (form.type === 'percent' && Number(value) > 100) {
                                            toast.warning('Giảm giá không vượt quá 100%');
                                            return;
                                        }

                                        handleChange(e);
                                    }}
                                />
                            </label>

                            <label>
                                Đơn tối thiểu
                                <input name="minOrder" type="number" value={form.minOrder} onChange={handleChange} />
                            </label>

                            <label>
                                Giảm tối đa
                                <input
                                    name="maxDiscount"
                                    type="number"
                                    value={form.maxDiscount}
                                    onChange={handleChange}
                                />
                            </label>

                            <label>
                                Số lượng
                                <input name="quantity" type="number" value={form.quantity} onChange={handleChange} />
                            </label>

                            <label>
                                Ngày hết hạn
                                <input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
                            </label>

                            <label className={cx('fullWidth')}>
                                Mô tả
                                <textarea name="description" value={form.description} onChange={handleChange} />
                            </label>
                        </div>

                        <div className={cx('modalActions')}>
                            <button type="button" className={cx('cancelBtn')} onClick={() => setShowForm(false)}>
                                Hủy
                            </button>

                            <button type="submit" className={cx('saveBtn')}>
                                <FontAwesomeIcon icon={faTicket} />
                                Lưu Voucher
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ManageVoucher;
