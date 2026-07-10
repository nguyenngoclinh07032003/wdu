import classNames from 'classnames/bind';
import styles from '../Styles/ManageBlog.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus,
    faSearch,
    faEye,
    faPen,
    faTrash,
    faChevronLeft,
    faChevronRight,
    faRotateLeft,
    faTrashCan,
    faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useState } from 'react';
import request from '../Config/api';
import CreateBlog from '../Pages/Admin/ComponentsAdmin/CreateBlog';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
const IMAGE_URL = process.env.REACT_APP_IMG || 'http://localhost:5001/uploads';

const normalizePath = (path) => {
    if (!path) return '';
    return String(path).trim();
};

const getImageUrl = (path) => {
    const value = normalizePath(path);

    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('blob:')) return value;

    if (value.startsWith('/uploads/')) {
        return `${SERVER_URL}${value}`;
    }

    if (value.startsWith('uploads/')) {
        return `${SERVER_URL}/${value}`;
    }

    return `${IMAGE_URL}/${value.replace(/^\/+/, '')}`;
};

const handleImageError = (e) => {
    if (e.currentTarget.dataset.errorHandled === 'true') return;
    e.currentTarget.dataset.errorHandled = 'true';
    e.currentTarget.src = 'https://via.placeholder.com/120x90?text=No+Image';
};

function ManageBlog() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedBlog, setSelectedBlog] = useState(null);

    const fetchBlogs = async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/admin/blogs');
            setBlogs(Array.isArray(res?.data) ? res.data : []);
        } catch (error) {
            console.log('Lỗi lấy danh sách bài viết:', error?.response?.data || error);
            setBlogs([]);
            toast.error('Lấy danh sách bài viết thất bại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const filteredBlogs = useMemo(() => {
        let result = [...blogs];

        switch (activeTab) {
            case 'published':
                result = result.filter((item) => item?.status === 'published');
                break;
            case 'draft':
                result = result.filter((item) => item?.status === 'draft');
                break;
            case 'trash':
                result = result.filter((item) => item?.status === 'deleted');
                break;
            case 'all':
            default:
                result = result.filter((item) => item?.status !== 'deleted');
                break;
        }

        if (searchKeyword.trim()) {
            const keyword = searchKeyword.trim().toLowerCase();
            result = result.filter(
                (item) =>
                    item?.title?.toLowerCase().includes(keyword) ||
                    item?.excerpt?.toLowerCase().includes(keyword) ||
                    item?.category?.toLowerCase().includes(keyword) ||
                    item?.author?.toLowerCase().includes(keyword),
            );
        }

        return result;
    }, [blogs, searchKeyword, activeTab]);

    const counts = useMemo(() => {
        return {
            all: blogs.filter((item) => item?.status !== 'deleted').length,
            published: blogs.filter((item) => item?.status === 'published').length,
            draft: blogs.filter((item) => item?.status === 'draft').length,
            trash: blogs.filter((item) => item?.status === 'deleted').length,
        };
    }, [blogs]);

    const handleOpenCreate = () => {
        setSelectedBlog(null);
        setShowCreateForm(true);
    };

    const handleOpenEdit = (blog) => {
        setSelectedBlog(blog);
        setShowCreateForm(true);
    };

    const handleCloseCreate = () => {
        setShowCreateForm(false);
        setSelectedBlog(null);
    };

    const handleCreateSuccess = async () => {
        await fetchBlogs();
        setShowCreateForm(false);
        setSelectedBlog(null);
    };

    const handleSoftDeleteBlog = async (id) => {
        if (!id) {
            toast.error('Không tìm thấy ID bài viết');
            return;
        }

        const confirmDelete = window.confirm('Bạn có chắc chắn muốn chuyển bài viết vào thùng rác?');
        if (!confirmDelete) return;

        try {
            setLoading(true);
            const response = await request.patch(`/api/admin/blogs/${id}/soft-delete`);
            toast.success(response?.data?.message || 'Đã chuyển vào thùng rác');
            await fetchBlogs();
        } catch (error) {
            console.log('Lỗi chuyển vào thùng rác:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Xóa bài viết thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreBlog = async (id) => {
        if (!id) {
            toast.error('Không tìm thấy ID bài viết');
            return;
        }

        const confirmRestore = window.confirm('Bạn có muốn khôi phục bài viết này không?');
        if (!confirmRestore) return;

        try {
            setLoading(true);
            const response = await request.patch(`/api/admin/blogs/${id}/restore`);
            toast.success(response?.data?.message || 'Đã khôi phục bài viết');
            await fetchBlogs();
        } catch (error) {
            console.log('Lỗi khôi phục bài viết:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Khôi phục bài viết thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleForceDeleteBlog = async (id) => {
        if (!id) {
            toast.error('Không tìm thấy ID bài viết');
            return;
        }

        const confirmDelete = window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn bài viết này?');
        if (!confirmDelete) return;

        try {
            setLoading(true);
            const response = await request.delete(`/api/admin/blogs/${id}/force-delete`);
            toast.success(response?.data?.message || 'Đã xóa vĩnh viễn bài viết');
            await fetchBlogs();
        } catch (error) {
            console.log('Lỗi xóa vĩnh viễn:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Xóa vĩnh viễn thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleEmptyTrash = async () => {
        const confirmEmpty = window.confirm('Bạn có chắc chắn muốn xóa toàn bộ bài viết trong thùng rác?');
        if (!confirmEmpty) return;

        try {
            setLoading(true);
            const response = await request.delete('/api/admin/blogs/trash/empty');
            toast.success(response?.data?.message || 'Đã dọn sạch thùng rác');
            await fetchBlogs();
        } catch (error) {
            console.log('Lỗi dọn thùng rác:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Dọn thùng rác thất bại');
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'published':
                return 'Đã xuất bản';
            case 'draft':
                return 'Bản nháp';
            case 'deleted':
                return 'Thùng rác';
            default:
                return 'Không xác định';
        }
    };

    const handleViewBlog = (blog) => {
        if (!blog?.slug) {
            toast.error('Bài viết chưa có slug để xem');
            return;
        }

        window.open(`/blog/${blog.slug}`, '_blank');
    };

    if (showCreateForm) {
        return (
            <>
                <CreateBlog
                    onBack={handleCloseCreate}
                    onSuccess={handleCreateSuccess}
                    initialData={selectedBlog}
                    isEdit={!!selectedBlog}
                />
                <ToastContainer position="top-right" autoClose={3000} />
            </>
        );
    }

    return (
        <>
            <div className={cx('wrapper')}>
                <div className={cx('header')}>
                    <div>
                        <h1>Quản lý Blog & Bài viết</h1>
                        <p>Xem, chỉnh sửa và quản lý các bài viết trên hệ thống.</p>
                    </div>

                    <div className={cx('headerActions')}>
                        <div className={cx('searchBox')}>
                            <FontAwesomeIcon icon={faSearch} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm bài viết..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                        </div>

                        <button className={cx('createBtn')} onClick={handleOpenCreate} type="button">
                            <FontAwesomeIcon icon={faPlus} />
                            <span>Viết bài mới</span>
                        </button>
                    </div>
                </div>

                <div className={cx('tableCard')}>
                    <div className={cx('tabs')}>
                        <button
                            className={cx('tabItem', { active: activeTab === 'all' })}
                            onClick={() => setActiveTab('all')}
                            type="button"
                        >
                            Tất cả <span>{counts.all}</span>
                        </button>

                        <button
                            className={cx('tabItem', { active: activeTab === 'published' })}
                            onClick={() => setActiveTab('published')}
                            type="button"
                        >
                            Đã xuất bản <span>{counts.published}</span>
                        </button>

                        <button
                            className={cx('tabItem', { active: activeTab === 'draft' })}
                            onClick={() => setActiveTab('draft')}
                            type="button"
                        >
                            Bản nháp <span>{counts.draft}</span>
                        </button>

                        <button
                            className={cx('tabItem', { active: activeTab === 'trash' })}
                            onClick={() => setActiveTab('trash')}
                            type="button"
                        >
                            Thùng rác <span>{counts.trash}</span>
                        </button>

                        {activeTab === 'trash' && counts.trash > 0 && (
                            <button className={cx('emptyTrashBtn')} type="button" onClick={handleEmptyTrash}>
                                <FontAwesomeIcon icon={faTrashCan} />
                                <span>Dọn thùng rác</span>
                            </button>
                        )}
                    </div>

                    <div className={cx('tableWrap')}>
                        <table className={cx('table')}>
                            <thead>
                                <tr>
                                    <th>BÀI VIẾT</th>
                                    <th>DANH MỤC</th>
                                    <th>TÁC GIẢ</th>
                                    <th>NGÀY TẠO</th>
                                    <th>LƯỢT XEM</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>HÀNH ĐỘNG</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className={cx('emptyRow')}>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : filteredBlogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={cx('emptyRow')}>
                                            Không có bài viết nào
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBlogs.map((blog) => {
                                        const blogId = blog?._id || blog?.id;

                                        return (
                                            <tr key={blogId}>
                                                <td>
                                                    <div className={cx('blogInfo')}>
                                                        <div className={cx('thumb')}>
                                                            {blog?.thumbnail && !blog.thumbnail.startsWith('blob:') ? (
                                                                <img
                                                                    src={getImageUrl(blog.thumbnail)}
                                                                    alt={blog?.title}
                                                                    onError={handleImageError}
                                                                />
                                                            ) : (
                                                                <div className={cx('noImage')}>No image</div>
                                                            )}
                                                        </div>

                                                        <div className={cx('blogText')}>
                                                            <h3>{blog?.title || 'Không có tiêu đề'}</h3>
                                                            <p>{blog?.excerpt || 'Không có mô tả ngắn'}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>{blog?.category || '---'}</td>
                                                <td>{blog?.author || 'Admin'}</td>
                                                <td>
                                                    {blog?.createdAt
                                                        ? new Date(blog.createdAt).toLocaleDateString('vi-VN')
                                                        : '---'}
                                                </td>
                                                <td>{blog?.views || 0}</td>
                                                <td>
                                                    <span className={cx('statusBadge', blog?.status)}>
                                                        {getStatusLabel(blog?.status)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={cx('actions')}>
                                                        {activeTab !== 'trash' ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className={cx('viewBtn')}
                                                                    title="Xem"
                                                                    onClick={() => handleViewBlog(blog)}
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={cx('editBtn')}
                                                                    title="Sửa"
                                                                    onClick={() => handleOpenEdit(blog)}
                                                                >
                                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={cx('deleteBtn')}
                                                                    title="Chuyển vào thùng rác"
                                                                    onClick={() => handleSoftDeleteBlog(blogId)}
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className={cx('restoreBtn')}
                                                                    title="Khôi phục"
                                                                    onClick={() => handleRestoreBlog(blogId)}
                                                                >
                                                                    <FontAwesomeIcon icon={faRotateLeft} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className={cx('deleteBtn')}
                                                                    title="Xóa vĩnh viễn"
                                                                    onClick={() => handleForceDeleteBlog(blogId)}
                                                                >
                                                                    <FontAwesomeIcon icon={faTrash} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={cx('footer')}>
                        <p>
                            Hiển thị {filteredBlogs.length > 0 ? 1 : 0} - {filteredBlogs.length} trên{' '}
                            {filteredBlogs.length} bài viết
                        </p>

                        <div className={cx('pagination')}>
                            <button type="button">
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>
                            <button type="button" className={cx('activePage')}>
                                1
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3000} />
        </>
    );
}

export default ManageBlog;
