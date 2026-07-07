import classNames from 'classnames/bind';
import styles from '../Styles/Pagination.module.scss';

import PaginationPage from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';

const cx = classNames.bind(styles);

function Pagination({ page, totalPages, handlePageChange }) {
    return (
        <div className={cx('wrapper')}>
            <Stack spacing={1}>
                <PaginationPage color="primary" count={totalPages} page={page} onChange={handlePageChange} />
            </Stack>
        </div>
    );
}

export default Pagination;
