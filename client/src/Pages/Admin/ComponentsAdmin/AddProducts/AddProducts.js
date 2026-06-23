import classNames from 'classnames/bind';
import styles from './AddProducts.module.scss';
import { useState, useRef, useMemo } from 'react';
import request from '../../../../Config/api';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { Editor } from '@tinymce/tinymce-react';

const cx = classNames.bind(styles);

function AddProducts({ setCheckOpenAddProduct }) {
    const [nameProduct, setNameProduct] = useState('');
    const [priceProduct, setPriceProduct] = useState('');
    const [description, setDescription] = useState('');
    const [fileImg, setFileImg] = useState([]);
    const [fileVideo, setFileVideo] = useState([]);
    const [checkType, setCheckType] = useState('0');
    const [loading, setLoading] = useState(false);
    const [isCombo, setIsCombo] = useState(false);

    const editorRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);

    const typeOptions = useMemo(
        () => [
            { value: '0', label: 'Chọn loại sản phẩm' },
            { value: '1', label: 'Dụng cụ massage' },
            { value: '2', label: 'Dưỡng sinh ngải cứu' },
            { value: '3', label: 'Tinh dầu & thảo dược' },
            { value: '4', label: 'Chăm sóc tóc & da đầu' },
        ],
        [],
    );

    const uniqueFiles = (files) =>
        files.filter(
            (file, index, self) =>
                index ===
                self.findIndex(
                    (item) =>
                        item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
                ),
        );

    const handleFileChange = (e) => {
        const filesArray = Array.from(e.target.files || []);

        setFileImg((prev) => {
            const merged = [...prev, ...filesArray];
            return uniqueFiles(merged).sort((a, b) => a.name.localeCompare(b.name));
        });

        e.target.value = '';
    };

    const handleVideoChange = (e) => {
        const filesArray = Array.from(e.target.files || []);

        const validVideos = filesArray.filter((file) => {
            const isVideo = file.type.startsWith('video/');
            const isLimit = file.size <= 100 * 1024 * 1024;

            if (!isVideo) {
                toast.error(`${file.name} không phải là video`);
                return false;
            }

            if (!isLimit) {
                toast.error(`${file.name} vượt quá 100MB`);
                return false;
            }

            return true;
        });

        setFileVideo((prev) => {
            const merged = [...prev, ...validVideos];
            return uniqueFiles(merged);
        });

        e.target.value = '';
    };

    const handleEditorChange = () => {
        if (editorRef.current) {
            setDescription(editorRef.current.getContent());
        }
    };

    const handleChooseFile = () => {
        fileInputRef.current?.click();
    };

    const handleChooseVideo = () => {
        videoInputRef.current?.click();
    };

    const removeImage = (indexRemove) => {
        setFileImg((prev) => prev.filter((_, index) => index !== indexRemove));
    };

    const removeVideo = (indexRemove) => {
        setFileVideo((prev) => prev.filter((_, index) => index !== indexRemove));
    };

    const clearForm = () => {
        setNameProduct('');
        setPriceProduct('');
        setDescription('');
        setCheckType('0');
        setFileImg([]);
        setFileVideo([]);
        setIsCombo(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }

        if (editorRef.current) {
            editorRef.current.setContent('');
        }
    };

    const validateForm = () => {
        if (!nameProduct.trim()) {
            toast.error('Vui lòng nhập tên sản phẩm');
            return false;
        }

        if (!priceProduct || Number(priceProduct) <= 0) {
            toast.error('Vui lòng nhập giá sản phẩm hợp lệ');
            return false;
        }

        if (checkType === '0') {
            toast.error('Vui lòng chọn loại sản phẩm');
            return false;
        }

        if (!description.trim()) {
            toast.error('Vui lòng nhập mô tả sản phẩm');
            return false;
        }

        if (fileImg.length === 0) {
            toast.error('Vui lòng chọn ít nhất 1 ảnh sản phẩm');
            return false;
        }

        return true;
    };

    const handleAddProduct = async () => {
        if (!validateForm()) return;

        const formData = new FormData();

        formData.append('nameProduct', nameProduct.trim());
        formData.append('priceProduct', Number(priceProduct));
        formData.append('description', description);
        formData.append('checkType', checkType);
        formData.append('isCombo', isCombo);

        fileImg.forEach((file) => {
            formData.append('fileImg', file);
        });

        fileVideo.forEach((file) => {
            formData.append('fileVideo', file);
        });

        try {
            setLoading(true);

            const response = await request.post('/api/addproduct', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success(response?.data?.message || 'Thêm sản phẩm thành công');
            clearForm();
        } catch (error) {
            console.error('Error uploading product:', error);
            toast.error(error?.response?.data?.message || 'Thêm sản phẩm thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <div className={cx('header')}>
                <div className={cx('headerLeft')}>
                    <button type="button" className={cx('backButton')} onClick={() => setCheckOpenAddProduct(false)}>
                        ←
                    </button>

                    <div>
                        <h1>Thêm sản phẩm mới</h1>
                        <p>Tạo sản phẩm mới và cập nhật thông tin hiển thị trong cửa hàng.</p>
                    </div>
                </div>

                <div className={cx('headerActions')}>
                    <button type="button" className={cx('cancelButton')} onClick={() => setCheckOpenAddProduct(false)}>
                        Hủy
                    </button>

                    <button type="button" className={cx('saveButton')} onClick={handleAddProduct} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu sản phẩm'}
                    </button>
                </div>
            </div>

            <div className={cx('grid')}>
                <div className={cx('leftColumn')}>
                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Thông tin chung</h3>
                        </div>

                        <div className={cx('cardBody')}>
                            <div className={cx('formGroup')}>
                                <label htmlFor="product-name">Tên sản phẩm</label>
                                <input
                                    id="product-name"
                                    type="text"
                                    value={nameProduct}
                                    onChange={(e) => setNameProduct(e.target.value)}
                                    placeholder="Nhập tên sản phẩm..."
                                />
                            </div>

                            <div className={cx('twoColumn')}>
                                <div className={cx('formGroup')}>
                                    <label htmlFor="product-price">Giá sản phẩm</label>
                                    <input
                                        id="product-price"
                                        type="number"
                                        min="0"
                                        value={priceProduct}
                                        onChange={(e) => setPriceProduct(e.target.value)}
                                        placeholder="Ví dụ: 150000"
                                    />
                                </div>

                                <div className={cx('formGroup')}>
                                    <label htmlFor="product-type">Loại sản phẩm</label>
                                    <select
                                        id="product-type"
                                        value={checkType}
                                        onChange={(e) => setCheckType(e.target.value)}
                                    >
                                        {typeOptions.map((item) => (
                                            <option key={item.value} value={item.value}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={cx('comboCheck')}>
                                <label className={cx('checkboxLabel')}>
                                    <input
                                        type="checkbox"
                                        checked={isCombo}
                                        onChange={(e) => setIsCombo(e.target.checked)}
                                    />
                                    <span></span>
                                    Đây là sản phẩm combo
                                </label>

                                <p>Nếu không tích, sản phẩm sẽ được xem là sản phẩm đơn lẻ.</p>
                            </div>

                            <div className={cx('formGroup')}>
                                <label>Mô tả sản phẩm</label>

                                <div className={cx('editorWrap')}>
                                    <Editor
                                        apiKey="n4hxnmi16uwk9dmdgfx6nscsf8oc30528dlcub1mzsk8deqy"
                                        onInit={(evt, editor) => (editorRef.current = editor)}
                                        initialValue=""
                                        init={{
                                            height: 350,
                                            menubar: false,
                                            plugins: [
                                                'advlist',
                                                'autolink',
                                                'lists',
                                                'link',
                                                'image',
                                                'charmap',
                                                'preview',
                                                'anchor',
                                                'searchreplace',
                                                'visualblocks',
                                                'code',
                                                'fullscreen',
                                                'insertdatetime',
                                                'media',
                                                'table',
                                                'help',
                                                'wordcount',
                                            ],
                                            toolbar:
                                                'undo redo | formatselect | bold italic underline | ' +
                                                'alignleft aligncenter alignright alignjustify | ' +
                                                'bullist numlist outdent indent | removeformat | help',
                                            content_style:
                                                'body { font-family:Inter,Arial,sans-serif; font-size:14px }',
                                            skin: 'oxide',
                                            branding: false,
                                        }}
                                        onChange={handleEditorChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Hình ảnh sản phẩm</h3>
                        </div>

                        <div className={cx('cardBody')}>
                            <div className={cx('uploadArea')}>
                                <input
                                    ref={fileInputRef}
                                    id="file-upload"
                                    type="file"
                                    name="fileImg"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    hidden
                                />

                                <div className={cx('uploadBox')}>
                                    <div className={cx('uploadIcon')}>⬆</div>
                                    <h4>Kéo và thả hình ảnh vào đây</h4>
                                    <p>Hỗ trợ JPG, PNG, WEBP</p>

                                    <button type="button" className={cx('browseButton')} onClick={handleChooseFile}>
                                        Duyệt tệp tin
                                    </button>
                                </div>

                                {fileImg.length > 0 && (
                                    <div className={cx('previewGrid')}>
                                        {fileImg.map((file, index) => (
                                            <div key={`${file.name}-${index}`} className={cx('previewItem')}>
                                                <img src={URL.createObjectURL(file)} alt={file.name} />

                                                <button
                                                    type="button"
                                                    className={cx('removePreview')}
                                                    onClick={() => removeImage(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Video sản phẩm</h3>
                        </div>

                        <div className={cx('cardBody')}>
                            <div className={cx('uploadArea')}>
                                <input
                                    ref={videoInputRef}
                                    type="file"
                                    name="fileVideo"
                                    multiple
                                    accept="video/mp4,video/webm,video/ogg"
                                    onChange={handleVideoChange}
                                    hidden
                                />

                                <div className={cx('uploadBox')}>
                                    <div className={cx('uploadIcon')}>🎥</div>
                                    <h4>Tải video sản phẩm</h4>
                                    <p>Hỗ trợ MP4, WEBM, OGG. Tối đa 100MB/video</p>

                                    <button type="button" className={cx('browseButton')} onClick={handleChooseVideo}>
                                        Chọn video
                                    </button>
                                </div>

                                {fileVideo.length > 0 && (
                                    <div className={cx('previewGrid')}>
                                        {fileVideo.map((file, index) => (
                                            <div key={`${file.name}-${index}`} className={cx('previewItem')}>
                                                <video src={URL.createObjectURL(file)} controls width="100%" />

                                                <button
                                                    type="button"
                                                    className={cx('removePreview')}
                                                    onClick={() => removeVideo(index)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx('rightColumn')}>
                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Phân loại</h3>
                        </div>

                        <div className={cx('cardBody')}>
                            <div className={cx('formGroup')}>
                                <label htmlFor="product-type-side">Danh mục sản phẩm</label>
                                <select
                                    id="product-type-side"
                                    value={checkType}
                                    onChange={(e) => setCheckType(e.target.value)}
                                >
                                    {typeOptions.map((item) => (
                                        <option key={item.value} value={item.value}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className={cx('summaryBox')}>
                                <span>Loại đang chọn</span>
                                <strong>
                                    {typeOptions.find((item) => item.value === checkType)?.label || 'Chưa chọn'}
                                </strong>
                            </div>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Gợi ý</h3>
                        </div>

                        <div className={cx('cardBody')}>
                            <ul className={cx('tipsList')}>
                                <li>Đặt tên sản phẩm ngắn gọn, rõ ràng.</li>
                                <li>Dùng ảnh sản phẩm sắc nét, nền sáng.</li>
                                <li>Video nên rõ sản phẩm, ánh sáng tốt.</li>
                                <li>Mô tả nên nêu công dụng và điểm nổi bật.</li>
                                <li>Chọn đúng loại để dễ quản lý hơn.</li>
                            </ul>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <h3>Thao tác nhanh</h3>
                        </div>

                        <div className={cx('cardBody', 'actionBody')}>
                            <button
                                type="button"
                                className={cx('secondaryButton')}
                                onClick={clearForm}
                                disabled={loading}
                            >
                                Xóa dữ liệu nhập
                            </button>

                            <button
                                type="button"
                                className={cx('primaryButton')}
                                onClick={handleAddProduct}
                                disabled={loading}
                            >
                                {loading ? 'Đang xử lý...' : 'Thêm sản phẩm'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AddProducts;
