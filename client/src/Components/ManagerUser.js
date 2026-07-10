import { useEffect, useMemo, useState } from 'react';
import request from '../Config/api';
import * as XLSX from 'xlsx';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import classNames from 'classnames/bind';
import styles from '../Styles/ManagerUser.module.scss';

import Pagination from './Pagination';
import ModalDeleteUser from '../utils/Modal/ModalDeleteUser';
import ModalEditUser from '../utils/Modal/ModalEditUser';
import { faMagnifyingGlass, faEye, faTrashCan, faPenToSquare, faFileExport } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import CustomerDetail from './CustomerDetail';

const cx = classNames.bind(styles);

function ManagerUser() {
    const [dataAllUser, setDataAllUser] = useState([]);
    const [dataOneUser, setDataOneUser] = useState({});
    const [show, setShow] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [page, setPage] = useState(1);
    const [searchValue, setSearchValue] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);

    const productsPerPage = 10;

    const getRoleLabel = (role, isAdmin) => {
        if (role === 'admin' || isAdmin) return 'Quản trị viên';
        if (role === 'staff') return 'Nhân viên (Staff)';
        if (role === 'doctor') return 'Bác sĩ (Doctor)';
        if (role === 'shipper') return 'Shipper';
        return 'Người dùng';
    };

    const isShipperStatusLocked = (user) => {
        return user?.role === 'shipper' && user?.isActive !== false && (user?.hasActiveDelivery || user?.activeDeliveryCount > 0);
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const fetchData = async () => {
        try {
            const res = await request.get('/api/getalluser');
            setDataAllUser(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Lỗi lấy danh sách user:', error);
            setDataAllUser([]);
            toast.error('Không thể tải danh sách người dùng');
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!show && !showEdit) {
            fetchData();
        }
    }, [show, showEdit]);

    useEffect(() => {
        setPage(1);
    }, [searchValue]);

    const showModalDeleteUser = (user) => {
        setShow(true);
        setDataOneUser(user);
    };

    const handleEditUser = (user) => {
        setDataOneUser(user);
        setShowEdit(true);
    };

    const handleViewDetail = (user) => {
        if (!user?._id) {
            toast.error('Không tìm thấy ID người dùng');
            return;
        }

        setSelectedCustomerId(user._id);
    };

    const handleToggleStatus = async (user) => {
        if (isShipperStatusLocked(user)) {
            toast.error(
                `Shipper đang giao ${user.activeDeliveryCount || 1} đơn hàng. Chỉ khóa được khi không còn đơn đang giao hoặc đã hoàn thành.`,
            );
            return;
        }

        try {
            const newStatus = !user.isActive;

            const res = await request.put(`/api/update-status-user/${user._id}`, {
                isActive: newStatus,
            });

            setDataAllUser((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: newStatus } : u)));

            toast.success(res?.data?.message || 'Cập nhật trạng thái thành công');
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            toast.error(error?.response?.data?.message || 'Cập nhật trạng thái thất bại');
        }
    };

    const filteredUsers = useMemo(() => {
        const keyword = searchValue.trim().toLowerCase();
        const users = [...dataAllUser];

        if (!keyword) return users;

        return users.filter((user) => {
            const fullname = String(user?.fullname || '').toLowerCase();
            const email = String(user?.email || '').toLowerCase();
            const phone = String(user?.phone || '').toLowerCase();
            const status = user?.isActive ? 'hoạt động' : 'bị khóa';
            const role = user?.isAdmin ? 'quản trị viên' : 'người dùng';

            return (
                fullname.includes(keyword) ||
                email.includes(keyword) ||
                phone.includes(keyword) ||
                status.includes(keyword) ||
                role.includes(keyword)
            );
        });
    }, [dataAllUser, searchValue]);

    const totalPages = Math.ceil(filteredUsers.length / productsPerPage);
    const startIndex = (page - 1) * productsPerPage;
    const currentProducts = filteredUsers.slice(startIndex, startIndex + productsPerPage);

    const getInitials = (name) => {
        if (!name) return 'U';
        const words = name.trim().split(' ').filter(Boolean);
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    const handleExportExcel = () => {
        if (!filteredUsers.length) {
            toast.warning('Không có dữ liệu để xuất');
            return;
        }

        const exportData = filteredUsers.map((user, index) => ({
            STT: index + 1,
            'ID người dùng': user?._id || '',
            'Họ tên': user?.fullname || 'Chưa có tên',
            Email: user?.email || 'Chưa cập nhật',
            'Số điện thoại': user?.phone ? `0${user.phone}` : 'Chưa cập nhật',
            'Vai trò': user?.isAdmin ? 'Quản trị viên' : 'Người dùng',
            'Trạng thái': user?.isActive ? 'Hoạt động' : 'Bị khóa',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        worksheet['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 25 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 15 }];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachNguoiDung');

        const now = new Date();
        const fileName = `danh_sach_nguoi_dung_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
            2,
            '0',
        )}-${String(now.getDate()).padStart(2, '0')}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        toast.success('Xuất file Excel thành công');
    };

    if (selectedCustomerId) {
        return (
            <>
                <CustomerDetail customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />
                <ToastContainer />
            </>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <div className={cx('header')}>
                <div className={cx('headerContent')}>
                    <h1>Quản lý khách hàng</h1>
                    <p>Quản lý và theo dõi thông tin người dùng trong hệ thống.</p>
                </div>

                <button type="button" className={cx('exportButton')} onClick={handleExportExcel}>
                    <FontAwesomeIcon icon={faFileExport} />
                    <span>Xuất danh sách</span>
                </button>
            </div>

            <div className={cx('searchCard')}>
                <div className={cx('searchBox')}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className={cx('searchIcon')} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, email, số điện thoại hoặc trạng thái..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                </div>
            </div>

            <div className={cx('tableCard')}>
                <div className={cx('tableWrap')}>
                    <table className={cx('userTable')}>
                        <thead>
                            <tr>
                                <th>Khách hàng</th>
                                <th>Số điện thoại</th>
                                <th>Email</th>
                                <th>Chức vụ</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentProducts.length > 0 ? (
                                currentProducts.map((user) => (
                                    <tr key={user._id}>
                                        <td>
                                            <div className={cx('userInfo')}>
                                                <div className={cx('avatar')}>
                                                    {user?.avatar ? (
                                                        <img
                                                            src={user.avatar}
                                                            alt={user.fullname}
                                                            className={cx('avatarImg')}
                                                        />
                                                    ) : (
                                                        getInitials(user.fullname)
                                                    )}
                                                </div>{' '}
                                                <div className={cx('userMeta')}>
                                                    <h4>{user.fullname || 'Chưa có tên'}</h4>
                                                    <span>ID: {user._id?.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className={cx('phone')}>
                                            {user?.phone ? `0${user.phone}` : 'Chưa cập nhật'}
                                        </td>

                                        <td className={cx('email')}>{user?.email || 'Chưa cập nhật'}</td>

                                        <td>
                                            <div className={cx('roleCell')}>
                                                <span
                                                    className={cx(
                                                        'roleBadge',
                                                        user?.role || (user?.isAdmin ? 'admin' : 'user'),
                                                    )}
                                                >
                                                    {getRoleLabel(user?.role, user?.isAdmin)}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={cx('statusToggle')}>
                                                <div
                                                    className={cx('switch', user?.isActive ? 'active' : 'inactive', {
                                                        disabled: isShipperStatusLocked(user),
                                                    })}
                                                    onClick={() => {
                                                        if (!isShipperStatusLocked(user)) {
                                                            handleToggleStatus(user);
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={isShipperStatusLocked(user) ? -1 : 0}
                                                    title={
                                                        isShipperStatusLocked(user)
                                                            ? `Shipper đang giao ${user.activeDeliveryCount || 1} đơn, chưa thể khóa`
                                                            : undefined
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (isShipperStatusLocked(user)) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            handleToggleStatus(user);
                                                        }
                                                    }}
                                                >
                                                    <div className={cx('circle')} />
                                                </div>

                                                <span
                                                    className={cx('statusText', user?.isActive ? 'active' : 'locked')}
                                                >
                                                    {user?.isActive ? 'Hoạt động' : 'Bị khóa'}
                                                    {isShipperStatusLocked(user) ? (
                                                        <span className={cx('deliveryHint')}>
                                                            {' '}
                                                            (Đang giao {user.activeDeliveryCount} đơn)
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={cx('actionGroup')}>
                                                <button
                                                    type="button"
                                                    className={cx('iconButton', 'viewButton')}
                                                    title="Xem chi tiết"
                                                    onClick={() => handleViewDetail(user)}
                                                >
                                                    <FontAwesomeIcon icon={faEye} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={cx('iconButton', 'editButton')}
                                                    title="Chỉnh sửa chức vụ"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>

                                                {/* <button
                                                    type="button"
                                                    className={cx('iconButton', 'deleteButton')}
                                                    title="Xóa người dùng"
                                                    onClick={() => showModalDeleteUser(user)}
                                                >
                                                    <FontAwesomeIcon icon={faTrashCan} />
                                                </button> */}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        <div className={cx('emptyState')}>Không tìm thấy người dùng nào.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={cx('footer')}>
                    <div className={cx('resultText')}>
                        Hiển thị{' '}
                        <strong>
                            {filteredUsers.length === 0 ? 0 : startIndex + 1}-
                            {Math.min(startIndex + productsPerPage, filteredUsers.length)}
                        </strong>{' '}
                        trong tổng số <strong>{filteredUsers.length}</strong> người dùng
                    </div>

                    {totalPages > 1 && (
                        <div className={cx('pagination')}>
                            <Pagination page={page} totalPages={totalPages} handlePageChange={handlePageChange} />
                        </div>
                    )}
                </div>
            </div>

            <ModalDeleteUser show={show} setShow={setShow} dataOneUser={dataOneUser} />
            <ModalEditUser show={showEdit} setShow={setShowEdit} dataOneUser={dataOneUser} fetchData={fetchData} />
        </div>
    );
}

export default ManagerUser;
