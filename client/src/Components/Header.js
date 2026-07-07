import classNames from 'classnames/bind';
import styles from '../Styles/Header.module.scss';
import request, { requestLogout } from '../Config/api';
import useDebounce from '../hooks/useDebounce';

import logo from '../assests/logo/logoxoa.jpg';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faCartShopping, faSearch, faUser } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import { useStore } from '../hooks/useStore';
import { canUseCustomerAsk } from '../utils/canUseCustomerAsk';

const cx = classNames.bind(styles);

function Header() {
    const [show, setShow] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [dataSearch, setDataSearch] = useState([]);

    const navigate = useNavigate();
    const { dataUser, dataCart } = useStore();

    const debounce = useDebounce(searchValue, 500);
    const showCustomerAskLinks = canUseCustomerAsk(dataUser);

    const handleClose = () => setShow(false);
    const handleShowMenu = () => setShow(true);

    useEffect(() => {
        const fetchSearch = async () => {
            try {
                if (!debounce.trim()) {
                    setDataSearch([]);
                    return;
                }

                const res = await request.get('/api/search', {
                    params: { nameProduct: debounce },
                });

                setDataSearch(res.data || []);
            } catch (error) {
                console.log(error);
                setDataSearch([]);
            }
        };

        fetchSearch();
    }, [debounce]);

    const handleLogOut = async () => {
        try {
            await requestLogout();
            navigate('/');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.log(error);
        }
    };

    const handleHomeClick = () => {
        navigate('/');
        // Force reload để load lại sản phẩm
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const totalCartItems = dataCart?.[0]?.products?.length || 0;

    const scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);

        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        }
    };
    return (
        <header className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('left')}>
                    <button onClick={handleHomeClick} className={cx('brand')}>
                        <img className={cx('logo')} src={logo} alt="" />
                    </button>

                    <nav className={cx('nav')}>
                        <Link to="/category">Sản phẩm</Link>
                        <Link to="/voucher">Ưu đãi</Link>
                        <Link to="/blog">Kiến thức</Link>
                        <Link to="/about">Về chúng tôi</Link>
                        <button type="button" className={cx('navLinkBtn')} onClick={() => scrollToSection('footer')}>
                            Liên hệ
                        </button>{' '}
                    </nav>
                </div>

                <div className={cx('right')}>
                    <div className={cx('search')}>
                        <FontAwesomeIcon className={cx('searchIcon')} icon={faSearch} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />

                        {searchValue.trim().length > 0 && (
                            <div className={cx('result')}>
                                {dataSearch.length > 0 ? (
                                    dataSearch.map((item) => (
                                        <Link
                                            to={
                                                item?._id && item?.slug
                                                    ? `/product/${item._id}/${item.slug}`
                                                    : '/category'
                                            }
                                            key={item._id || item.name}
                                            onClick={() => {
                                                setSearchValue('');
                                                setDataSearch([]);
                                            }}
                                        >
                                            <div className={cx('form-result')}>
                                                {item?.img?.[0] ? (
                                                    <img
                                                        src={`${process.env.REACT_APP_IMG}/${item.img[0]}`}
                                                        alt={item.name}
                                                    />
                                                ) : (
                                                    <div className={cx('thumbFallback')}>No img</div>
                                                )}

                                                <div className={cx('resultInfo')}>
                                                    <span className={cx('nameProduct')}>{item.name}</span>
                                                    {item?.price ? (
                                                        <span className={cx('price')}>
                                                            {item.price.toLocaleString()} đ
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <div className={cx('emptyResult')}>Không tìm thấy sản phẩm</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className={cx('cartIcon')}>
                        <Link to="/cart">
                            <FontAwesomeIcon className={cx('iconCart')} icon={faCartShopping} />
                        </Link>
                        {totalCartItems > 0 && <span>{totalCartItems}</span>}
                    </div>

                    {dataUser?._id ? (
                        <div className={cx('userBox')}>
                            {/* Hello user */}
                            <div className={cx('helloUser')}>
                                <span className={cx('helloText')}>Hello,</span>
                                <span className={cx('userName')}>
                                    {dataUser?.name || dataUser?.username || dataUser?.fullname}
                                </span>
                            </div>

                            <div className="dropdown">
                                <button
                                    className={cx('userMenuBtn', 'dropdown-toggle')}
                                    type="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <FontAwesomeIcon icon={faUser} />
                                    <span>Tài khoản</span>
                                </button>

                                <ul className="dropdown-menu">
                                    <li>
                                        <Link className="dropdown-item" to="/info">
                                            Thông Tin Người Dùng
                                        </Link>
                                    </li>

                                    {showCustomerAskLinks && (
                                        <>
                                            <li>
                                                <Link className="dropdown-item" to="/hoi-bac-si">
                                                    Hỏi bác sĩ
                                                </Link>
                                            </li>
                                            <li>
                                                <Link className="dropdown-item" to="/hoi-nhan-vien">
                                                    Hỏi nhân viên
                                                </Link>
                                            </li>
                                        </>
                                    )}

                                    {dataUser?.isAdmin && (
                                        <li>
                                            <Link className="dropdown-item" to="/admin">
                                                Trang Quản Trị
                                            </Link>
                                        </li>
                                    )}

                                    {dataUser?.role === 'staff' && (
                                        <li>
                                            <Link className="dropdown-item" to="/staff">
                                                Trang Nhân Viên
                                            </Link>
                                        </li>
                                    )}

                                    {dataUser?.role === 'doctor' && (
                                        <li>
                                            <Link className="dropdown-item" to="/doctor">
                                                Trang Bác Sĩ
                                            </Link>
                                        </li>
                                    )}

                                    {dataUser?.role === 'shipper' && (
                                        <li>
                                            <Link className="dropdown-item" to="/shipper/dashboard">
                                                Kiểm tra đơn hàng (Shipper)
                                            </Link>
                                        </li>
                                    )}

                                    <li>
                                        <button className={cx('logoutBtn')} onClick={handleLogOut}>
                                            Đăng Xuất
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className={cx('loginBtn')}>
                            <Link to="/login">
                                <FontAwesomeIcon icon={faUser} />
                                <span>Login</span>
                            </Link>
                        </div>
                    )}
                </div>

                <div className={cx('btnMenuMobile')}>
                    <button onClick={handleShowMenu}>
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                </div>
            </div>

            <Offcanvas show={show} onHide={handleClose} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>
                        <Link to="/" onClick={handleClose}>
                            <img className={cx('mobileLogo')} src={logo} alt="Healthcare Devices" />
                        </Link>
                    </Offcanvas.Title>
                </Offcanvas.Header>

                <Offcanvas.Body>
                    <div className={cx('mobileSearch')}>
                        <FontAwesomeIcon className={cx('searchIcon')} icon={faSearch} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sản phẩm..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                        />
                    </div>

                    <div className={cx('rowLeftMobile')}>
                        <ul>
                            <li>
                                <Link to="/" onClick={handleClose}>
                                    Trang chủ
                                </Link>
                            </li>
                            <li>
                                <Link to="/category" onClick={handleClose}>
                                    Sản phẩm
                                </Link>
                            </li>
                            <li>
                                <Link to="/voucher" onClick={handleClose}>
                                    Ưu đãi
                                </Link>
                            </li>
                            <li>
                                <Link to="/blog" onClick={handleClose}>
                                    Blog
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" onClick={handleClose}>
                                    Về chúng tôi
                                </Link>
                            </li>
                            <button
                                type="button"
                                className={cx('mobileLinkBtn')}
                                onClick={() => {
                                    handleClose();
                                    scrollToSection('footer');
                                }}
                            >
                                Liên hệ
                            </button>

                            <li>
                                <Link to="/cart" onClick={handleClose}>
                                    Giỏ hàng
                                </Link>
                            </li>

                            <li>
                                <Link to={dataUser?._id ? '/info' : '/login'} onClick={handleClose}>
                                    {dataUser?._id ? 'Thông Tin Người Dùng' : 'Đăng Nhập'}
                                </Link>
                            </li>

                            {showCustomerAskLinks && (
                                <>
                                    <li>
                                        <Link to="/hoi-bac-si" onClick={handleClose}>
                                            Hỏi bác sĩ
                                        </Link>
                                    </li>
                                    <li>
                                        <Link to="/hoi-nhan-vien" onClick={handleClose}>
                                            Hỏi nhân viên
                                        </Link>
                                    </li>
                                </>
                            )}

                            {dataUser?.isAdmin && (
                                <li>
                                    <Link to="/admin" onClick={handleClose}>
                                        Trang Quản Trị
                                    </Link>
                                </li>
                            )}

                            {dataUser?.role === 'staff' && (
                                <li>
                                    <Link to="/staff" onClick={handleClose}>
                                        Trang Nhân Viên
                                    </Link>
                                </li>
                            )}

                            {dataUser?.role === 'doctor' && (
                                <li>
                                    <Link to="/doctor" onClick={handleClose}>
                                        Trang Bác Sĩ
                                    </Link>
                                </li>
                            )}

                            {dataUser?.role === 'shipper' && (
                                <li>
                                    <Link className="dropdown-item" to="/shipper/dashboard" onClick={handleClose}>
                                        Kiểm tra đơn hàng (Shipper)
                                    </Link>
                                </li>
                            )}

                            {dataUser?._id && (
                                <li>
                                    <button
                                        className={cx('mobileLogout')}
                                        onClick={() => {
                                            handleClose();
                                            handleLogOut();
                                        }}
                                    >
                                        Đăng Xuất
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>
                </Offcanvas.Body>
            </Offcanvas>
        </header>
    );
}

export default Header;
