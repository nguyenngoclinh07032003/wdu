import classNames from 'classnames/bind';
import styles from '../../../Styles/StaffPortal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faMagnifyingGlass, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useMemo, useState } from 'react';

const cx = classNames.bind(styles);

function StaffTopBar({ staffName = 'Nhân viên', inboxUnreadTotal = 0, supportPendingCount = 0, onOpenInbox }) {
    const [search, setSearch] = useState('');
    const avatarFallback = useMemo(
        () => (staffName || 'N').trim().charAt(0).toUpperCase(),
        [staffName],
    );
    const notifCount = (inboxUnreadTotal || 0) + (supportPendingCount || 0);

    return (
        <header className={cx('topbar')}>
            <div className={cx('searchBox')}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm đơn hàng, khách hàng, bác sĩ, shipper..."
                />
            </div>

            <div className={cx('topActions')}>
                <button type="button" className={cx('iconBtn')} onClick={() => onOpenInbox?.()} aria-label="Thông báo">
                    <FontAwesomeIcon icon={faBell} />
                    {notifCount > 0 ? (
                        <span className={cx('badge')}>{notifCount > 9 ? '9+' : notifCount}</span>
                    ) : null}
                </button>
                <div className={cx('topUser')}>
                    <div className={cx('topAvatar')}>{avatarFallback}</div>
                    <strong>{staffName}</strong>
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 11, color: '#7a8a74' }} />
                </div>
            </div>
        </header>
    );
}

export default StaffTopBar;
