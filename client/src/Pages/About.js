import classNames from 'classnames/bind';
import styles from '../Styles/About.module.scss';

import Header from '../Components/Header';
import Footer from '../Components/Footer';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHeart, faHeartCircleCheck, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import Chatbot from '../utils/Chatbot/Chatbot';

import ceoImage from '../assests/imgs/ceo.png';
import cfoImage from '../assests/imgs/cfo.png';
import ctoImage from '../assests/imgs/cto.png';
import cpoImage from '../assests/imgs/cpo.png';
import ccoImage from '../assests/imgs/cco.png';
import cmoImage from '../assests/imgs/cmo.png';
import groupImage from '../assests/imgs/group.png';

const cx = classNames.bind(styles);

function About() {
    const values = [
        {
            icon: faShieldHeart,
            title: 'Tự nhiên & An toàn',
            desc: 'Ưu tiên các sản phẩm thảo dược và phương pháp chăm sóc lành tính.',
        },
        {
            icon: faHeartCircleCheck,
            title: 'Tâm huyết & Tận tâm',
            desc: 'Chúng tôi luôn đặt sức khỏe khách hàng lên hàng đầu với đội ngũ tư vấn tận tình và dịch vụ hỗ trợ xuyên suốt.',
        },
        {
            icon: faWandMagicSparkles,
            title: 'Đồng hành & Chia sẻ',
            desc: 'Không chỉ bán sản phẩm mà còn hỗ trợ kiến thức chăm sóc sức khỏe.',
        },
    ];

    const timeline = [
        {
            year: '2026',
            title: 'Khởi đầu & Thử nghiệm',
            desc: 'Ra mắt thương hiệu "Xoa Xoa", nghiên cứu thị trường, thử nghiệm các sản phẩm chăm sóc sức khỏe tại nhà và xây dựng kênh bán hàng online. Tập trung tiếp cận sinh viên và nhân viên văn phòng.',
        },
        {
            year: '2027',
            title: 'Phát triển & Mở rộng sản phẩm',
            desc: 'Mở rộng danh mục sản phẩm chăm sóc sức khỏe, xây dựng cộng đồng người dùng và đẩy mạnh marketing trên các nền tảng mạng xã hội và thương mại điện tử.',
        },
        {
            year: '2028',
            title: 'Xây dựng thương hiệu',
            desc: 'Tăng độ nhận diện thương hiệu, hợp tác với các kênh bán hàng lớn và phát triển hệ thống nội dung hướng dẫn chăm sóc sức khỏe tại nhà.',
        },
        {
            year: '2029',
            title: 'Mở rộng quy mô',
            desc: 'Hoàn thiện hệ sinh thái sản phẩm chăm sóc sức khỏe, mở rộng thị trường và hướng tới trở thành thương hiệu chăm sóc sức khỏe tại nhà dành cho người trẻ.',
        },
    ];

    const leaders = [
        {
            name: 'Nguyễn Văn Phan',
            role: 'Giám đốc điều hành (CEO)',
            image: ceoImage,
            type: 'ceo',
        },
        {
            name: 'Nguyễn Thị Xuân Mai',
            role: 'Giám đốc hành chính (CFO)',
            image: cfoImage,
            type: 'cfo',
        },
        {
            name: 'Bùi Đức Duy',
            role: 'Giám đốc công nghệ (CTO)',
            image: ctoImage,
            type: 'cto',
        },
        {
            name: 'Nguyễn Nam Quân',
            role: 'Giám đốc sản phẩm (CPO)',
            image: cpoImage,
            type: 'cpo',
        },
        {
            name: 'Đặng Quỳnh Anh',
            role: 'Giám đốc nội dung (CCO)',
            image: ccoImage,
            type: 'cco',
        },
        {
            name: 'Nguyễn Trung Hiếu',
            role: 'Giám đốc Marketing (CMO)',
            image: cmoImage,
            type: 'cmo',
        },
    ];

    return (
        <>
            <Header />

            <main className={cx('wrapper')}>
                <section className={cx('hero')}>
                    <div className={cx('heroOverlay')}></div>

                    <div className={cx('heroContent')}>
                        <div className={cx('heroPeople')}>
                            <div className={cx('person', 'person1')}></div>
                            <div className={cx('person', 'person2')}></div>
                            <div className={cx('person', 'person3')}></div>
                        </div>

                        <h1>Sứ mệnh chăm sóc sức khỏe cho mọi nhà</h1>

                        <p>
                            Mang đến các giải pháp chăm sóc sức khỏe tại nhà đơn giản, an toàn và tiện lợi, giúp mọi
                            người chủ động chăm sóc cơ thể, giảm căng thẳng và nâng cao chất lượng cuộc sống mỗi ngày.
                        </p>

                        <div className={cx('heroTextBg')}>"Mộc Xoa"</div>
                    </div>
                </section>

                <section className={cx('story')}>
                    <div className={cx('storyImage')}>
                        <img src={groupImage} alt="Đội nhóm Xoa Xoa" className={cx('groupImage')} />
                    </div>

                    <div className={cx('storyContent')}>
                        <span className={cx('subTitle')}>CÂU CHUYỆN CỦA CHÚNG TÔI</span>
                        <h2>Từ tầm nhìn đến hành trình tận tâm</h2>

                        <p>
                            Trong cuộc sống hiện đại, nhiều người trẻ phải đối mặt với áp lực học tập, công việc và tình
                            trạng đau mỏi cơ thể do ngồi lâu, ít vận động. Tuy nhiên, không phải ai cũng có thời gian
                            hoặc chi phí để thường xuyên đến các trung tâm chăm sóc sức khỏe.
                        </p>

                        <p>
                            Nhận thấy thực tế đó, nhóm chúng tôi – gồm những sinh viên đến từ nhiều chuyên ngành như
                            Công nghệ thông tin, Marketing, Truyền thông và Thiết kế – đã cùng nhau xây dựng dự án “Mộc
                            Xoa”, với mục tiêu mang đến giải pháp chăm sóc sức khỏe tại nhà đơn giản, tiện lợi và phù
                            hợp với người trẻ.
                        </p>

                        <p>
                            Thông qua các sản phẩm massage và thảo dược thư giãn, Mộc Xoa mong muốn giúp người dùng giảm
                            đau mỏi, thư giãn tinh thần và hình thành thói quen chủ động chăm sóc sức khỏe mỗi ngày.
                        </p>
                    </div>
                </section>

                <section className={cx('values')}>
                    <div className={cx('sectionHeading')}>
                        <h2>Giá trị cốt lõi</h2>
                        <span></span>
                    </div>

                    <div className={cx('valuesGrid')}>
                        {values.map((item, index) => (
                            <div className={cx('valueCard')} key={index}>
                                <div className={cx('valueIcon')}>
                                    <FontAwesomeIcon icon={item.icon} />
                                </div>

                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={cx('timeline')}>
                    <div className={cx('sectionHeading')}>
                        <h2>Hành trình phát triển</h2>
                        <span></span>
                    </div>

                    <div className={cx('timelineWrap')}>
                        <div className={cx('timelineLine')}></div>

                        {timeline.map((item, index) => (
                            <div
                                className={cx('timelineItem', {
                                    left: index % 2 === 0,
                                    right: index % 2 !== 0,
                                })}
                                key={index}
                            >
                                <div className={cx('timelineDot')}></div>

                                <div className={cx('timelineContent')}>
                                    <h3>{item.year}</h3>
                                    <h4>{item.title}</h4>
                                    <p>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className={cx('leaders')}>
                    <div className={cx('sectionHeading')}>
                        <p className={cx('miniLabel')}>ĐỘI NGŨ CHIẾN LƯỢC</p>
                        <h2>Đội ngũ lãnh đạo</h2>
                        <small>Những con người tâm huyết đứng sau "Mộc Xoa"</small>
                    </div>

                    <div className={cx('leaderGrid')}>
                        {leaders.map((leader, index) => (
                            <div className={cx('leaderCard', leader.type)} key={index}>
                                <div className={cx('leaderVisual')}>
                                    {leader.image ? (
                                        <img src={leader.image} alt={leader.name} className={cx('leaderImage')} />
                                    ) : typeof leader.icon === 'string' ? (
                                        <span className={cx('textIcon')}>{leader.icon}</span>
                                    ) : leader.icon ? (
                                        <div className={cx('faIcon')}>
                                            <FontAwesomeIcon icon={leader.icon} />
                                        </div>
                                    ) : (
                                        <span className={cx('textIcon')}>{leader.type?.toUpperCase()}</span>
                                    )}
                                </div>

                                <div className={cx('leaderInfo')}>
                                    <h3>{leader.name}</h3>
                                    <span>{leader.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
            <Chatbot />
        </>
    );
}

export default About;
