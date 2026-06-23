import classNames from 'classnames/bind';
import styles from '../../Styles/CreateBlog.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faFloppyDisk,
    faPaperPlane,
    faImage,
    faCircleQuestion,
    faCalendarDays,
    faBold,
    faItalic,
    faUnderline,
    faListUl,
    faListOl,
    faQuoteRight,
    faLink,
    faCode,
    faAlignLeft,
    faAlignCenter,
    faAlignRight,
    faPlay,
    faStar,
} from '@fortawesome/free-solid-svg-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import request from '../../Config/api';
import { toast } from 'react-toastify';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER;
const IMAGE_URL = process.env.REACT_APP_IMG;

const normalizePath = (path) => {
    if (!path) return '';
    return String(path).trim();
};

const getImageUrl = (path) => {
    const value = normalizePath(path);

    if (!value) return '';
    if (value.startsWith('blob:')) return value;
    if (value.startsWith('http://') || value.startsWith('https://')) return value;

    if (value.startsWith('/uploads/')) {
        return `${SERVER_URL}${value}`;
    }

    if (value.startsWith('uploads/')) {
        return `${SERVER_URL}/${value}`;
    }

    return `${IMAGE_URL}/${value.replace(/^\/+/, '')}`;
};

const convertImageUrlToRelativePath = (url) => {
    const value = normalizePath(url);

    if (!value) return '';
    if (value.startsWith('blob:')) return '';
    if (value.startsWith('/uploads/')) return value;
    if (value.startsWith('uploads/')) return `/${value}`;

    if (value.startsWith(`${SERVER_URL}/uploads/`)) {
        return value.replace(SERVER_URL, '');
    }

    if (value.startsWith(`${IMAGE_URL}/`)) {
        const fileName = value.replace(`${IMAGE_URL}/`, '');
        return `/uploads/${fileName}`;
    }

    if (value === IMAGE_URL) return '';

    return value;
};

function CreateBlog({ onBack, onSuccess, initialData, isEdit }) {
    const fileInputRef = useRef(null);
    const blobUrlRef = useRef('');

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [author, setAuthor] = useState('Admin');
    const [tags, setTags] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [metaDescription, setMetaDescription] = useState('');
    const [publishMode, setPublishMode] = useState('now');
    const [scheduleDate, setScheduleDate] = useState('');
    const [thumbnail, setThumbnail] = useState(null);
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const [featured, setFeatured] = useState(false);
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [loadingPublish, setLoadingPublish] = useState(false);

    const categories = ['Mẹo sức khỏe', 'Hướng dẫn sử dụng', 'Tin tức'];
    const authors = ['Admin'];

    useEffect(() => {
        if (!initialData) return;

        setTitle(initialData?.title || '');
        setContent(initialData?.content || '');
        setCategory(initialData?.category || '');
        setAuthor(initialData?.author || 'Admin');
        setTags(Array.isArray(initialData?.tags) ? initialData.tags.join(', ') : initialData?.tags || '');
        setSeoTitle(initialData?.seoTitle || '');
        setMetaDescription(initialData?.metaDescription || '');
        setScheduleDate(initialData?.scheduleDate ? initialData.scheduleDate.slice(0, 16) : '');
        setFeatured(Boolean(initialData?.featured));
        setThumbnail(null);

        if (initialData?.publishMode) {
            setPublishMode(initialData.publishMode);
        } else {
            setPublishMode(initialData?.scheduleDate ? 'schedule' : 'now');
        }

        setThumbnailPreview(initialData?.thumbnail ? getImageUrl(initialData.thumbnail) : '');
    }, [initialData]);

    useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
                blobUrlRef.current = '';
            }
        };
    }, []);

    const seoTitleCount = useMemo(() => seoTitle.trim().length, [seoTitle]);
    const metaDescriptionCount = useMemo(() => metaDescription.trim().length, [metaDescription]);

    const handleChooseImage = () => {
        fileInputRef.current?.click();
    };

    const handleSetThumbnailFile = (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn file ảnh hợp lệ');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ảnh đại diện không được vượt quá 2MB');
            return;
        }

        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = '';
        }

        const previewUrl = URL.createObjectURL(file);
        blobUrlRef.current = previewUrl;

        setThumbnail(file);
        setThumbnailPreview(previewUrl);
    };

    const handleChangeThumbnail = (e) => {
        const file = e.target.files?.[0];
        handleSetThumbnailFile(file);

        if (e.target) {
            e.target.value = '';
        }
    };

    const handleDropImage = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        handleSetThumbnailFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const buildPayload = (status) => {
        return {
            title: title.trim(),
            excerpt: content
                .trim()
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .slice(0, 160),
            content: content.trim(),
            category,
            author,
            tags: tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            seoTitle: seoTitle.trim(),
            metaDescription: metaDescription.trim(),
            status,
            publishMode,
            scheduleDate: publishMode === 'schedule' ? scheduleDate : '',
            thumbnail: thumbnail ? '' : convertImageUrlToRelativePath(thumbnailPreview),
            featured,
        };
    };

    const validateForm = () => {
        if (!title.trim()) {
            toast.error('Vui lòng nhập tiêu đề bài viết');
            return false;
        }

        if (!content.trim()) {
            toast.error('Vui lòng nhập nội dung bài viết');
            return false;
        }

        if (!category) {
            toast.error('Vui lòng chọn danh mục');
            return false;
        }

        if (!author) {
            toast.error('Vui lòng chọn tác giả');
            return false;
        }

        if (publishMode === 'schedule' && !scheduleDate) {
            toast.error('Vui lòng chọn thời gian hẹn đăng');
            return false;
        }

        return true;
    };

    const submitBlog = async (payload) => {
        const blogId = initialData?._id || initialData?.id;

        let data = payload;
        let headers = {};

        if (thumbnail instanceof File) {
            data = new FormData();

            Object.keys(payload).forEach((key) => {
                if (key === 'thumbnail') {
                    data.append('thumbnail', thumbnail);
                } else if (key === 'tags') {
                    data.append('tags', JSON.stringify(payload.tags || []));
                } else if (key === 'featured') {
                    data.append('featured', String(payload.featured));
                } else {
                    data.append(key, payload[key] ?? '');
                }
            });

            headers = {
                'Content-Type': 'multipart/form-data',
            };
        } else {
            data = {
                ...payload,
                featured: Boolean(payload.featured),
                thumbnail: convertImageUrlToRelativePath(payload.thumbnail),
            };
        }

        if (isEdit && blogId) {
            return request.patch(`/api/admin/blogs/${blogId}`, data, { headers });
        }

        return request.post('/api/admin/blogs', data, { headers });
    };

    const handleSaveDraft = async () => {
        if (!title.trim()) {
            toast.error('Vui lòng nhập tiêu đề bài viết');
            return;
        }

        try {
            setLoadingDraft(true);
            const payload = buildPayload('draft');
            await submitBlog(payload);
            toast.success(isEdit ? 'Cập nhật nháp thành công' : 'Đã lưu nháp thành công');
            onSuccess?.();
        } catch (error) {
            console.log('Lỗi lưu nháp:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Lưu nháp thất bại');
        } finally {
            setLoadingDraft(false);
        }
    };

    const handlePublish = async () => {
        if (!validateForm()) return;

        try {
            setLoadingPublish(true);
            const payload = buildPayload('published');
            await submitBlog(payload);

            if (publishMode === 'schedule') {
                toast.success(isEdit ? 'Cập nhật lịch đăng bài thành công' : 'Đã tạo lịch đăng bài');
            } else {
                toast.success(isEdit ? 'Cập nhật bài viết thành công' : 'Xuất bản bài viết thành công');
            }

            onSuccess?.();
        } catch (error) {
            console.log('Lỗi xuất bản:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Xuất bản bài viết thất bại');
        } finally {
            setLoadingPublish(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('topbar')}>
                <div className={cx('breadcrumb')}>
                    <button type="button" className={cx('backBtn')} onClick={onBack}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div className={cx('topActions')}>
                    <button
                        className={cx('draftBtn')}
                        onClick={handleSaveDraft}
                        disabled={loadingDraft || loadingPublish}
                    >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        <span>{loadingDraft ? 'Đang lưu...' : isEdit ? 'Cập nhật nháp' : 'Lưu nháp'}</span>
                    </button>

                    <button
                        className={cx('publishBtn')}
                        onClick={handlePublish}
                        disabled={loadingDraft || loadingPublish}
                    >
                        <FontAwesomeIcon icon={faPaperPlane} />
                        <span>{loadingPublish ? 'Đang xử lý...' : isEdit ? 'Cập nhật bài viết' : 'Xuất bản'}</span>
                    </button>
                </div>
            </div>

            <div className={cx('layout')}>
                <div className={cx('editorColumn')}>
                    <div className={cx('titleCard')}>
                        <input
                            type="text"
                            placeholder="Tiêu đề bài viết..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className={cx('editorCard')}>
                        <div className={cx('toolbar')}>
                            <button type="button">
                                <FontAwesomeIcon icon={faBold} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faItalic} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faUnderline} />
                            </button>

                            <div className={cx('divider')}></div>

                            <button type="button">
                                <FontAwesomeIcon icon={faListUl} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faListOl} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faQuoteRight} />
                            </button>

                            <div className={cx('divider')}></div>

                            <button type="button">
                                <FontAwesomeIcon icon={faImage} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faLink} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faPlay} />
                            </button>

                            <div className={cx('divider')}></div>

                            <button type="button">
                                <FontAwesomeIcon icon={faAlignLeft} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faAlignCenter} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faAlignRight} />
                            </button>
                            <button type="button">
                                <FontAwesomeIcon icon={faCode} />
                            </button>

                            <span className={cx('autosaveText')}>
                                {isEdit ? 'Chỉnh sửa bài viết' : 'Soạn bài viết mới'}
                            </span>
                        </div>

                        <textarea
                            placeholder="Bắt đầu viết nội dung bài viết tại đây..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>
                </div>

                <div className={cx('sidebarColumn')}>
                    <div className={cx('panel')}>
                        <div className={cx('panelHeader')}>
                            <h3>THÔNG TIN CHUNG</h3>
                        </div>

                        <div className={cx('panelBody')}>
                            <div className={cx('formGroup')}>
                                <label>Danh mục</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                    <option value="">Chọn danh mục</option>
                                    {categories.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={cx('formGroup')}>
                                <label>Tác giả</label>
                                <select value={author} onChange={(e) => setAuthor(e.target.value)}>
                                    {authors.map((item) => (
                                        <option key={item} value={item}>
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={cx('formGroup')}>
                                <label>Tags</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: huyết áp, chăm sóc sức khỏe"
                                    value={tags}
                                    onChange={(e) => setTags(e.target.value)}
                                />
                                <small>Nhập nhiều tag, phân tách bằng dấu phẩy</small>
                            </div>

                            <div className={cx('formGroup')}>
                                <label className={cx('featuredCheck')}>
                                    <input
                                        type="checkbox"
                                        checked={featured}
                                        onChange={(e) => setFeatured(e.target.checked)}
                                    />
                                    <span>
                                        <FontAwesomeIcon icon={faStar} />
                                        Đánh dấu là bài viết nổi bật
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHeader')}>
                            <h3>ẢNH ĐẠI DIỆN</h3>
                        </div>

                        <div className={cx('panelBody')}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleChangeThumbnail}
                            />

                            <div
                                className={cx('uploadBox', { hasImage: !!thumbnailPreview })}
                                onClick={handleChooseImage}
                                onDrop={handleDropImage}
                                onDragOver={handleDragOver}
                            >
                                {thumbnailPreview ? (
                                    <img
                                        src={thumbnailPreview}
                                        alt="thumbnail-preview"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src =
                                                'https://via.placeholder.com/600x300?text=Khong+tai+duoc+anh';
                                        }}
                                    />
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faImage} />
                                        <p>Kéo thả ảnh vào đây hoặc click để tải lên</p>
                                        <span>PNG, JPG (Tối đa 2MB)</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHeader')}>
                            <h3>CẤU HÌNH SEO</h3>
                            <FontAwesomeIcon icon={faCircleQuestion} />
                        </div>

                        <div className={cx('panelBody')}>
                            <div className={cx('formGroup')}>
                                <div className={cx('labelRow')}>
                                    <label>SEO Title</label>
                                    <span>{seoTitleCount}/60</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Nhập tiêu đề SEO..."
                                    value={seoTitle}
                                    onChange={(e) => setSeoTitle(e.target.value)}
                                    maxLength={60}
                                />
                            </div>

                            <div className={cx('formGroup')}>
                                <div className={cx('labelRow')}>
                                    <label>Meta Description</label>
                                    <span>{metaDescriptionCount}/160</span>
                                </div>
                                <textarea
                                    placeholder="Mô tả nội dung bài viết..."
                                    value={metaDescription}
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    maxLength={160}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHeader')}>
                            <h3>TRẠNG THÁI</h3>
                        </div>

                        <div className={cx('panelBody')}>
                            <label className={cx('radioItem')}>
                                <input
                                    type="radio"
                                    name="publishMode"
                                    value="now"
                                    checked={publishMode === 'now'}
                                    onChange={(e) => setPublishMode(e.target.value)}
                                />
                                <div>
                                    <strong>Hiển thị ngay</strong>
                                    <p>Bài viết sẽ được công khai ngay lập tức</p>
                                </div>
                            </label>

                            <label className={cx('radioItem')}>
                                <input
                                    type="radio"
                                    name="publishMode"
                                    value="schedule"
                                    checked={publishMode === 'schedule'}
                                    onChange={(e) => setPublishMode(e.target.value)}
                                />
                                <div>
                                    <strong>Hẹn giờ đăng</strong>
                                    <p>Thiết lập thời gian xuất bản bài viết</p>
                                </div>
                            </label>

                            <div className={cx('scheduleBox', { active: publishMode === 'schedule' })}>
                                <FontAwesomeIcon icon={faCalendarDays} />
                                <input
                                    type="datetime-local"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    disabled={publishMode !== 'schedule'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateBlog;
