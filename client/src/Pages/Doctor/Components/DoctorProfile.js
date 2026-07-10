import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCertificateUrl, isCertificateImage, STATUS_LABELS } from '../doctorUtils';

const cx = classNames.bind(styles);

const EMPTY_PROFILE = {
    fullname: '',
    email: '',
    specialty: '',
    hospital: '',
    licenseNumber: '',
    certificateUrl: '',
    certificateFileName: '',
    status: 'pending',
    rejectionReason: '',
    updatedAt: null,
};

function DoctorProfile() {
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [localPreviewUrl, setLocalPreviewUrl] = useState('');
    const [profile, setProfile] = useState(EMPTY_PROFILE);

    const hasCompleteProfile = Boolean(
        profile.specialty?.trim() && profile.hospital?.trim() && profile.licenseNumber?.trim()
    );

    const fetchProfile = async ({ silent = false, keepEditingState = false } = {}) => {
        try {
            if (!silent) setLoading(true);
            const res = await request.get('/api/doctor/profile');
            const data = res.data || {};
            setProfile({ ...EMPTY_PROFILE, ...data });

            const complete = Boolean(
                data.specialty?.trim() && data.hospital?.trim() && data.licenseNumber?.trim()
            );

            if (!keepEditingState) {
                setIsEditing(!complete);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải hồ sơ bác sĩ');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        return () => {
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        };
    }, [localPreviewUrl]);

    useEffect(() => {
        if (!successMessage) return undefined;

        const timer = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timer);
    }, [successMessage]);

    const showSuccess = (message) => {
        setSuccessMessage(message);
        toast.success(message);
    };

    const handleSave = async () => {
        if (!profile.specialty?.trim() || !profile.hospital?.trim() || !profile.licenseNumber?.trim()) {
            toast.error('Vui lòng điền đầy đủ chuyên khoa, số giấy phép và cơ sở công tác');
            return;
        }

        try {
            setSaving(true);
            const res = await request.put('/api/doctor/profile', {
                specialty: profile.specialty,
                hospital: profile.hospital,
                licenseNumber: profile.licenseNumber,
            });
            const message = res?.data?.message || 'Lưu hồ sơ thành công';
            showSuccess(message);
            setProfile({ ...EMPTY_PROFILE, ...(res?.data?.profile || profile) });
            setIsEditing(false);
            await fetchProfile({ silent: true, keepEditingState: true });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lưu hồ sơ thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
            setLocalPreviewUrl('');
        }

        let previewUrl = '';
        if (file.type.startsWith('image/')) {
            previewUrl = URL.createObjectURL(file);
            setLocalPreviewUrl(previewUrl);
        }

        const formData = new FormData();
        formData.append('certificate', file);

        try {
            setUploading(true);
            const res = await request.post('/api/doctor/certificate', formData);
            setProfile({ ...EMPTY_PROFILE, ...(res?.data?.profile || profile) });
            toast.info('Đã tải chứng chỉ lên. Vui lòng điền đủ thông tin và bấm Lưu hồ sơ.');

            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
            setLocalPreviewUrl('');
            await fetchProfile({ silent: true, keepEditingState: true });
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Upload chứng chỉ thất bại');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    if (loading) {
        return <div className={cx('doctorPage')}>Đang tải hồ sơ...</div>;
    }

    const statusClass =
        profile.status === 'approved'
            ? 'statusApproved'
            : profile.status === 'rejected'
              ? 'statusRejected'
              : 'statusPending';

    const serverImageUrl = profile.certificateUrl ? getCertificateUrl(profile.certificateUrl) : '';
    const showServerImage =
        !localPreviewUrl &&
        serverImageUrl &&
        isCertificateImage(profile.certificateFileName || profile.certificateUrl);
    const displayImageUrl = localPreviewUrl || (showServerImage ? serverImageUrl : '');

    const renderCertificatePreview = () => {
        if (displayImageUrl) {
            return (
                <div className={cx('certificatePreview')}>
                    <img src={displayImageUrl} alt="Chứng chỉ hành nghề" className={cx('certificateImage')} />
                    {profile.certificateFileName ? (
                        <span className={cx('certificateName')}>{profile.certificateFileName}</span>
                    ) : null}
                    {serverImageUrl ? (
                        <a href={serverImageUrl} target="_blank" rel="noreferrer" className={cx('certificateLink')}>
                            Mở ảnh full size
                        </a>
                    ) : null}
                </div>
            );
        }

        if (profile.certificateUrl) {
            return (
                <div className={cx('certificatePreview')}>
                    <span>File: {profile.certificateFileName || 'Chứng chỉ'} — </span>
                    <a href={serverImageUrl} target="_blank" rel="noreferrer" className={cx('certificateLink')}>
                        Xem chứng chỉ (PDF)
                    </a>
                </div>
            );
        }

        return <span className={cx('certificateEmpty')}>Chưa upload chứng chỉ</span>;
    };

    const renderRejectionNotice = () => {
        if (profile.status !== 'rejected') return null;

        return (
            <div className={cx('rejectionCard')}>
                <strong>Chứng chỉ / hồ sơ bị từ chối</strong>
                <p>
                    <span className={cx('rejectionLabel')}>Lý do từ Admin: </span>
                    {profile.rejectionReason?.trim()
                        ? profile.rejectionReason
                        : 'Admin chưa ghi lý do cụ thể. Vui lòng liên hệ quản trị viên.'}
                </p>
                <p style={{ marginTop: 8 }}>
                    Vui lòng cập nhật thông tin hoặc upload lại chứng chỉ, sau đó bấm <strong>Lưu hồ sơ</strong> để
                    gửi duyệt lại.
                </p>
            </div>
        );
    };

    const renderSuccessBanner = () => {
        if (!successMessage) return null;

        return (
            <div className={cx('successBanner')} role="status">
                <span className={cx('successIcon')}>✓</span>
                <div>
                    <strong>Lưu thành công</strong>
                    <p>{successMessage}</p>
                </div>
            </div>
        );
    };

    if (!isEditing && hasCompleteProfile) {
        return (
            <div className={cx('doctorPage')}>
                <ToastContainer position="top-right" autoClose={3000} />
                <h2 className={cx('pageTitle')}>Hồ sơ & Chứng chỉ</h2>
                <p className={cx('pageDesc')}>Hồ sơ của bạn đã được lưu. Bạn có thể xem lại hoặc chỉnh sửa bất cứ lúc nào.</p>

                {renderSuccessBanner()}
                {renderRejectionNotice()}

                <div className={cx('statusCard', statusClass)}>
                    <strong>Trạng thái: {STATUS_LABELS[profile.status] || profile.status}</strong>
                    {profile.status === 'pending' ? (
                        <p className={cx('statusNote')}>Hồ sơ đang chờ Admin xem xét và duyệt chứng chỉ.</p>
                    ) : null}
                    {profile.status === 'approved' ? (
                        <p className={cx('statusNote')}>Hồ sơ đã được duyệt. Chỉnh sửa sẽ gửi lại để Admin xem xét.</p>
                    ) : null}
                </div>

                <div className={cx('profileViewCard')}>
                    <div className={cx('profileViewHeader')}>
                        <div>
                            <h3>{profile.fullname || 'Bác sĩ'}</h3>
                            <span>{profile.email || ''}</span>
                        </div>
                        {profile.updatedAt ? (
                            <span className={cx('updatedAt')}>
                                Cập nhật: {new Date(profile.updatedAt).toLocaleString('vi-VN')}
                            </span>
                        ) : null}
                    </div>

                    <div className={cx('profileViewGrid')}>
                        <div className={cx('profileViewItem')}>
                            <label>Chuyên khoa</label>
                            <p>{profile.specialty || '—'}</p>
                        </div>
                        <div className={cx('profileViewItem')}>
                            <label>Số giấy phép hành nghề</label>
                            <p>{profile.licenseNumber || '—'}</p>
                        </div>
                        <div className={cx('profileViewItem', 'fullWidth')}>
                            <label>Cơ sở công tác</label>
                            <p>{profile.hospital || '—'}</p>
                        </div>
                        <div className={cx('profileViewItem', 'fullWidth')}>
                            <label>Chứng chỉ hành nghề</label>
                            {renderCertificatePreview()}
                        </div>
                    </div>
                </div>

                <div className={cx('actions')}>
                    <button
                        type="button"
                        className={cx('primaryBtn')}
                        onClick={() => {
                            setSuccessMessage('');
                            setIsEditing(true);
                        }}
                    >
                        Chỉnh sửa hồ sơ
                    </button>
                    <button
                        type="button"
                        className={cx('secondaryBtn')}
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Đang upload...' : 'Đổi chứng chỉ'}
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                        onChange={handleUpload}
                        className={cx('hiddenFileInput')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className={cx('doctorPage')}>
            <ToastContainer position="top-right" autoClose={3000} />
            <h2 className={cx('pageTitle')}>{hasCompleteProfile ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ & Chứng chỉ'}</h2>
            <p className={cx('pageDesc')}>
                {hasCompleteProfile
                    ? 'Cập nhật thông tin chuyên môn hoặc upload lại chứng chỉ, sau đó bấm Lưu hồ sơ.'
                    : 'Điền đầy đủ thông tin, upload chứng chỉ (nếu có), rồi bấm Lưu hồ sơ để gửi Admin duyệt.'}
            </p>

            <div className={cx('statusCard', statusClass)}>
                <strong>Trạng thái: {STATUS_LABELS[profile.status] || profile.status}</strong>
            </div>

            {renderRejectionNotice()}

            <div className={cx('formGrid')}>
                <div className={cx('formGroup')}>
                    <label>Chuyên khoa</label>
                    <input
                        value={profile.specialty}
                        onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                        placeholder="VD: Nội tổng quát"
                    />
                </div>

                <div className={cx('formGroup')}>
                    <label>Số giấy phép hành nghề</label>
                    <input
                        value={profile.licenseNumber}
                        onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
                        placeholder="VD: 12345/BYT"
                    />
                </div>

                <div className={cx('formGroup', 'fullWidth')}>
                    <label>Cơ sở công tác</label>
                    <input
                        value={profile.hospital}
                        onChange={(e) => setProfile({ ...profile, hospital: e.target.value })}
                        placeholder="VD: Bệnh viện Đa khoa..."
                    />
                </div>

                <div className={cx('formGroup', 'fullWidth')}>
                    <label>Chứng chỉ hành nghề (PDF, JPG, PNG)</label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    {renderCertificatePreview()}
                    {uploading ? <span className={cx('uploadingText')}>Đang upload chứng chỉ...</span> : null}
                </div>
            </div>

            <div className={cx('actions')}>
                <button type="button" className={cx('primaryBtn')} onClick={handleSave} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                </button>
                {hasCompleteProfile ? (
                    <button type="button" className={cx('secondaryBtn')} onClick={() => setIsEditing(false)}>
                        Hủy
                    </button>
                ) : null}
            </div>
        </div>
    );
}

export default DoctorProfile;
