import classNames from 'classnames/bind';
import styles from '../Styles/ManageProducts.module.scss';
import Pagination from './Pagination';

import React, { useState, useEffect, useMemo } from 'react';
import ModalDeletePro from '../utils/Modal/DeleteProduct';
import ModalUpdatePro from '../utils/Modal/ModalUpdatePro';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faTrashCan, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import request from '../Config/api';
import { getFirstUploadUrl } from '../utils/imageUrl';

const cx = classNames.bind(styles);

function ManageProducts({ setCheckOpenAddProduct }) {
    const [page, setPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState({});
    const [showModalDelete, setShowModalDelete] = useState(false);
    const [showModalUpdate, setShowModalUpdate] = useState(false);
    const [dataProduct, setDataProduct] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const productsPerPage = 6;

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const handleShowModalDelete = (item) => {
        setSelectedProduct(item);
        setShowModalDelete(true);
    };

    const handleShowModalUpdate = (item) => {
        setSelectedProduct(item);
        setShowModalUpdate(true);
    };

    useEffect(() => {
        fetchData();
    }, [showModalDelete, showModalUpdate]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            const productsResponse = await request.get('/api/products');
            setDataProduct(Array.isArray(productsResponse.data) ? productsResponse.data : []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const getProductType = (type) => {
        switch (type) {
            case 1:
                return 'Dụng cụ massage';
            case 2:
                return 'Dưỡng sinh ngải cứu';
            case 3:
                return 'Tinh dầu & thảo dược';
            default:
                return 'Chăm sóc tóc & da đầu';
        }
    };

    const filteredProducts = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();

        if (!keyword) return dataProduct;

        return dataProduct.filter((item) => {
            const name = item?.name?.toLowerCase() || '';
            const type = getProductType(item?.type).toLowerCase();
            return name.includes(keyword) || type.includes(keyword);
        });
    }, [dataProduct, searchTerm]);

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (page - 1) * productsPerPage;
    const currentProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <div className={cx('headerLeft')}>
                    <h1>Quản lý sản phẩm</h1>
                    <p>Quản lý danh sách sản phẩm, cập nhật thông tin và chỉnh sửa nhanh.</p>
                </div>

                <div className={cx('headerRight')}>
                    <div className={cx('searchBox')}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} className={cx('searchIcon')} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button onClick={() => setCheckOpenAddProduct(true)} type="button" className={cx('addButton')}>
                        + Thêm sản phẩm mới
                    </button>
                </div>
            </div>

            <div className={cx('contentCard')}>
                <div className={cx('cardTop')}>
                    <div className={cx('resultText')}>
                        Hiển thị <strong>{currentProducts.length}</strong> / <strong>{filteredProducts.length}</strong>{' '}
                        sản phẩm
                    </div>
                </div>

                <div className={cx('tableWrap')}>
                    <table className={cx('productTable')}>
                        <thead>
                            <tr>
                                <th>Ảnh</th>
                                <th>Tên sản phẩm</th>
                                <th>Danh mục</th>
                                <th>Giá bán</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentProducts.length > 0 ? (
                                currentProducts.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <div className={cx('imageBox')}>
                                                <img
                                                    src={getFirstUploadUrl(item?.img)}
                                                    alt={item?.name || 'product'}
                                                />
                                            </div>
                                        </td>

                                        <td>
                                            <div className={cx('productInfo')}>
                                                <h4>{item?.name}</h4>
                                                <span>ID: {item?._id}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className={cx('typeBadge')}>{getProductType(item?.type)}</span>
                                        </td>

                                        <td>
                                            <span className={cx('price')}>
                                                {Number(item?.price || 0).toLocaleString()} đ
                                            </span>
                                        </td>

                                        <td>
                                            <div className={cx('actionGroup')}>
                                                <button
                                                    type="button"
                                                    className={cx('iconButton', 'editButton')}
                                                    title="Chỉnh sửa"
                                                    onClick={() => handleShowModalUpdate(item)}
                                                >
                                                    <FontAwesomeIcon icon={faPenToSquare} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className={cx('iconButton', 'deleteButton')}
                                                    title="Xóa sản phẩm"
                                                    onClick={() => handleShowModalDelete(item)}
                                                >
                                                    <FontAwesomeIcon icon={faTrashCan} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">
                                        <div className={cx('emptyState')}>Không tìm thấy sản phẩm nào.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className={cx('pagination')}>
                        <Pagination totalPages={totalPages} page={page} handlePageChange={handlePageChange} />
                    </div>
                )}
            </div>

            <ModalDeletePro show={showModalDelete} setShow={setShowModalDelete} nameProduct={selectedProduct} />

            <ModalUpdatePro show={showModalUpdate} setShow={setShowModalUpdate} data={selectedProduct} />
        </div>
    );
}

export default ManageProducts;
