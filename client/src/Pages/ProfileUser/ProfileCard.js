import classNames from 'classnames/bind';
import styles from '../../Styles/InfoUser.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function ProfileCard({ fullName, avatarSrc, onChooseAvatar, fileInputRef, onChangeAvatar, memberSince, memberRank }) {
    return (
        <div className={cx('profileCard')}>
            <div className={cx('avatarWrap')}>
                <div className={cx('avatar')}>
                    <img src={avatarSrc} alt="avatar" />
                </div>

                <button className={cx('cameraBtn')} type="button" onClick={onChooseAvatar}>
                    <FontAwesomeIcon icon={faCamera} />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={cx('hiddenInput')}
                    onChange={onChangeAvatar}
                />
            </div>

            <div className={cx('profileInfo')}>
                <h2>{fullName}</h2>
                <p>Thành viên từ: {memberSince}</p>

                <div className={cx('memberBadge')}>
                    <span className={cx('dot')}></span>
                    <span>{memberRank}</span>
                </div>
            </div>
        </div>
    );
}

export default ProfileCard;
