import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faBox,
    faLocationDot,
    faBell,
} from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function AccountSidebar({ onLogout, activeKey = 'profile', onChangeTab }) {
    return (
        <aside className={cx('sidebar')}>
            <div className={cx('menuCard')}>
                <h3 className={cx('menuTitle')}>QUẢN LÝ TÀI KHOẢN</h3>

                <ul className={cx('menuList')}>
                    <li
                        className={cx('menuItem', { active: activeKey === 'profile' })}
                        onClick={() => onChangeTab('profile')}
                    >
                        <FontAwesomeIcon icon={faUser} />
                        <span>Thông tin cá nhân</span>
                    </li>

                    <li
                        className={cx('menuItem', { active: activeKey === 'orders' })}
                        onClick={() => onChangeTab('orders')}
                    >
                        <FontAwesomeIcon icon={faBox} />
                        <span>Đơn hàng của tôi</span>
                    </li>

                    <li
                        className={cx('menuItem', { active: activeKey === 'address' })}
                        onClick={() => onChangeTab('address')}
                    >
                        <FontAwesomeIcon icon={faLocationDot} />
                        <span>Sổ địa chỉ</span>
                    </li>

                    <li
                        className={cx('menuItem', {
                            active: activeKey === 'reminder',
                        })}
                        onClick={() => onChangeTab('reminder')}
                    >
                        <FontAwesomeIcon icon={faBell} />
                        <span>Nhắc nhở sức khỏe</span>
                    </li>

                    <li
                        className={cx('menuItem', { active: activeKey === 'review' })}
                        onClick={() => onChangeTab('review')}
                    >
                        <FontAwesomeIcon icon={faStar} />
                        <span>Đánh giá sản phẩm</span>
                    </li>
                </ul>

                <button onClick={onLogout} className={cx('logoutBtn')} type="button">
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>Đăng xuất</span>
                </button>
            </div>
 main
        </aside>
    );
}

export default AccountSidebar;
