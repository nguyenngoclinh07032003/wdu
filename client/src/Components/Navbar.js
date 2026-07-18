import classNames from 'classnames/bind';
import styles from '../Styles/Navbar.module.scss';

const cx = classNames.bind(styles);

function Navbar({ props }) {
    return (
        <div className={cx('wrapper')}>
            {props.map((item) => (
                <span key={item._id}>
                    Trang Chủ /{' '}
                    {item.type === '1'
                        ? 'Dụng cụ massage'
                        : item.type === '2'
                          ? 'Dưỡng sinh ngải cứu'
                          : item.type === '3'
                            ? 'Tinh dầu & thảo dược'
                            : item.type === '4'
                              ? 'Chăm sóc tóc & da đầu'
                              : ''}{' '}
                    / {item.name}
                </span>
            ))}
        </div>
    );
}

export default Navbar;
