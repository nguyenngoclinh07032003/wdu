import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPen, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function PersonalInfoForm({ formData, onChangeValue, onSave, onCancel, loadingSave }) {
    return (
        <div className={cx('formCard')}>
            <div className={cx('formHeader')}>
                <FontAwesomeIcon icon={faUserPen} />
                <h3>Thông tin cá nhân</h3>
            </div>

            <div className={cx('formGrid')}>
                <div className={cx('formGroup')}>
                    <label>Họ và tên</label>
                    <input
                        type="text"
                        name="fullname"
                        value={formData.fullname}
                        onChange={onChangeValue}
                        placeholder="Nhập họ và tên"
                    />
                </div>

                <div className={cx('formGroup')}>
                    <label>Số điện thoại</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={onChangeValue}
                        placeholder="Nhập số điện thoại"
                    />
                </div>

                <div className={cx('formGroup')}>
                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={onChangeValue}
                        placeholder="Nhập email"
                    />
                </div>

                <div className={cx('formGroup')}>
                    <label>Mật khẩu</label>
                    <input type="text" value="**********" readOnly />
                </div>

            </div>

            <div className={cx('actions')}>
                <button type="button" className={cx('saveBtn')} onClick={onSave} disabled={loadingSave}>
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    <span>{loadingSave ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>

                <button type="button" className={cx('cancelBtn')} onClick={onCancel}>
                    Hủy
                </button>
            </div>
        </div>
    );
}

export default PersonalInfoForm;
