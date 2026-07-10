import { useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Review.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faStar } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const reviews = [
    {
        id: 1,
        name: 'Anh Trịnh Trần Phương Tuấn',
        city: 'Bến Tre',
        avatar: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4yQSyebJkCdZ_LoV5l0xoUhDmkk0v07kAdw&s',
        content:
            'Búa ngải rất chắc tay, mùi thảo dược dễ chịu. Tôi dùng để gõ vai gáy mỗi tối, cảm giác thư giãn và giảm đau mỏi rõ rệt. Người lớn tuổi trong nhà cũng dùng rất thích.',
    },
    {
        id: 2,
        name: 'Chị Thiên An',
        birthday: '1985-08-20',
        city: 'TP. HCM',
        avatar: 'https://images2.thanhnien.vn/528068263637045248/2025/6/5/edit-edit-48167838611199627765427577517528353262708749n-17491092128971272300575.jpeg',
        content:
            'Tôi bị đau lưng lâu năm, sau khi dùng thảm ngải cứu thấy ngủ ngon hơn và giảm đau rõ rệt. Sản phẩm làm khá dày và chắc chắn.',
    },
];

const faqData = [
    {
        id: 1,
        question: 'Tất cả các sản phẩm được bảo hành không?',
        answer: 'Tất cả các sản phẩm đều được bảo hành theo chính sách của chúng tôi.',
    },
    {
        id: 2,
        question: 'Có người hướng dẫn sử dụng không?',
        answer: 'Có, chúng tôi cung cấp hướng dẫn sử dụng chi tiết kèm theo sản phẩm.',
    },
    {
        id: 3,
        question: 'Hỗ trợ trả góp qua thẻ tín dụng không?',
        answer: 'Chúng tôi không hỗ trợ trả góp qua thẻ tín dụng.',
    },
    {
        id: 4,
        question: 'Phí vận chuyển đi tỉnh là bao nhiêu?',
        answer: 'Phí vận chuyển sẽ thay đổi theo khu vực, cân nặng đơn hàng và đơn vị giao hàng. Khi đặt hàng hệ thống sẽ hiển thị mức phí cụ thể.',
    },
    {
        id: 5,
        question: 'Cần hỗ trợ tư vấn sản phẩm, liên hệ như thế nào?',
        answer: 'Bạn có thể chat với chúng tôi qua chatbot trên website hoặc nhắn tin qua zalo cho chúng tôi.',
    },
];

function Review() {
    const [openId, setOpenId] = useState(1);

    const handleToggle = (id) => {
        setOpenId(openId === id ? null : id);
    };

    return (
        <section className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('left')}>
                    <h2>Khách hàng nói gì về chúng tôi</h2>

                    <div className={cx('reviewList')}>
                        {reviews.map((item) => (
                            <div key={item.id} className={cx('reviewCard')}>
                                <div className={cx('reviewTop')}>
                                    <div className={cx('userInfo')}>
                                        <img src={item.avatar} alt={item.name} />
                                        <div className={cx('userText')}>
                                            <h3>{item.name}</h3>
                                            <span>{item.city}</span>
                                        </div>
                                    </div>

                                    <div className={cx('stars')}>
                                        {[...Array(5)].map((_, index) => (
                                            <FontAwesomeIcon key={index} icon={faStar} />
                                        ))}
                                    </div>
                                </div>

                                <p className={cx('reviewContent')}>"{item.content}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={cx('right')}>
                    <h2>Câu hỏi thường gặp</h2>

                    <div className={cx('faqList')}>
                        {faqData.map((item) => {
                            const isOpen = openId === item.id;

                            return (
                                <div key={item.id} className={cx('faqItem', { active: isOpen })}>
                                    <button className={cx('faqQuestion')} onClick={() => handleToggle(item.id)}>
                                        <span>{item.question}</span>
                                        <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} />
                                    </button>

                                    <div className={cx('faqAnswer')}>
                                        <p>{item.answer}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Review;
