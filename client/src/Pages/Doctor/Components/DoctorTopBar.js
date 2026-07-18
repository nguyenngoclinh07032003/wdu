import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPortal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faMagnifyingGlass, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useMemo, useState } from 'react';

const cx = classNames.bind(styles);

function DoctorTopBar({ doctorName = 'Bác sĩ', inboxUnreadTotal = 0, onSearch, onOpenInbox }) {
    const [search, setSearch] = useState('');

    const displayName = useMemo(() => {
        if (!doctorName) return 'Bác sĩ';
        return doctorName.startsWith('BS.') || doctorName.startsWith('BS ') ? doctorName : `BS. ${doctorName}`;
    }, [doctorName]);

    const avatarFallback = displayName.replace(/^BS\.\s*/i, '').charAt(0).toUpperCase() || 'D';
    const notifCount = inboxUnreadTotal > 0 ? Math.min(inboxUnreadTotal, 9) : 0;

    return (
        <header className={cx('topbar')}>
            <div className={cx('searchBox')}>
                <FontAwesomeIcon icon={faMagnifyingGlass} />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSearch?.(search.trim());
                    }}
                    placeholder="Tìm kiếm câu hỏi, bệnh nhân, hồ sơ..."
                />
            </div>

            <div className={cx('topActions')}>
                <button
                    type="button"
                    className={cx('iconBtn')}
                    aria-label="Thông báo"
                    onClick={() => onOpenInbox?.()}
                >
                    <FontAwesomeIcon icon={faBell} />
                    {notifCount > 0 ? <span className={cx('badge')}>{notifCount}</span> : null}
                </button>
                <button
                    type="button"
                    className={cx('iconBtn')}
                    aria-label="Tin nhắn"
                    onClick={() => onOpenInbox?.()}
                >
                    <FontAwesomeIcon icon={faEnvelope} />
                    {inboxUnreadTotal > 0 ? (
                        <span className={cx('badge')}>
                            {inboxUnreadTotal > 9 ? '9+' : inboxUnreadTotal}
                        </span>
                    ) : null}
                </button>

                <div className={cx('topUser')}>
                    <div className={cx('topAvatar')}>{avatarFallback}</div>
                    <strong>{displayName}</strong>
                    <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 11, color: '#7a8a74' }} />
                </div>
            </div>
        </header>
    );
}

export default DoctorTopBar;
