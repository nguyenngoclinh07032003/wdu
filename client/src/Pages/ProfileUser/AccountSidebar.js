import classNames from 'classnames/bind';
import styles from '../../Styles/InfoUser.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faBox,
    faLocationDot,
    faStar,
    faRightFromBracket,
    faBell,
    faHeadset,
} from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function AccountSidebar({ onLogout, activeKey = 'profile', onChangeTab, unreadNotificationCount = 0 }) {
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
                        className={cx('menuItem', { active: activeKey === 'notifications' })}
                        onClick={() => onChangeTab('notifications')}
                    >
                        <FontAwesomeIcon icon={faBell} />
                        <span>Thông báo</span>
                        {unreadNotificationCount > 0 ? (
                            <span className={cx('menuBadge')}>{unreadNotificationCount}</span>
                        ) : null}
                    </li>

                    <li
                        className={cx('menuItem', { active: activeKey === 'support' })}
                        onClick={() => onChangeTab('support')}
                    >
                        <FontAwesomeIcon icon={faHeadset} />
                        <span>Yêu cầu hỗ trợ của tôi</span>
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

            {/* <div className={cx('rankCard')}>
                <div className={cx('rankTop')}>
                    <span className={cx('rankLabel')}>HẠNG THÀNH VIÊN</span>
                    <FontAwesomeIcon icon={faTrophy} className={cx('rankIcon')} />
                </div>

                <h4 className={cx('rankName')}>Thành viên Bạc</h4>

                <div className={cx('progressBar')}>
                    <div className={cx('progressValue')}></div>
                </div>

                <p className={cx('rankDesc')}>Còn 350 điểm để lên hạng Vàng</p>
            </div> */}
        </aside>
    );
}

export default AccountSidebar;
