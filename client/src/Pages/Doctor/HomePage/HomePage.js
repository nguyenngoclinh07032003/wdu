import classNames from 'classnames/bind';
import styles from '../../Admin/HomePage/HomePage.module.scss';
import DoctorProfile from '../Components/DoctorProfile';
import DoctorQA from '../Components/DoctorQA';
import DoctorInbox from '../Components/DoctorInbox';

const cx = classNames.bind(styles);

function HomePage({ checkTypeSlideBar }) {
    return (
        <div className={cx('wrapper')}>
            {checkTypeSlideBar === 1 ? <DoctorProfile /> : null}
            {checkTypeSlideBar === 2 ? <DoctorQA /> : null}
            {checkTypeSlideBar === 3 ? <DoctorInbox /> : null}
        </div>
    );
}

export default HomePage;
