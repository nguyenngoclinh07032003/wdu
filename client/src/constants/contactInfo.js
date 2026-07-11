export const CONTACT_INFO = {
    address: 'Thạch Hoà, Thạch Thất, Hà Nội',
    phone: '0986003022',
    phoneDisplay: '0986 003 022',
    hotlineHours: '08:00–21:00, từ thứ Hai đến Chủ nhật',
    customerEmail: 'linhnnhe171195@fpt.edu.vn',
    partnerEmail: 'linhnnhe171195@fpt.edu.vn',
    zaloUrl: 'https://zalo.me/0986003022',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61589897113612',
    mapDirectionsUrl: 'https://www.google.com/maps/search/?api=1&query=Thạch+Hoà,+Thạch+Thất,+Hà+Nội',
    mapEmbedUrl:
        'https://www.google.com/maps?q=Thạch+Hoà,+Thạch+Thất,+Hà+Nội&z=14&output=embed',
    officeNote: 'Đây là địa chỉ văn phòng làm việc. Khách hàng vui lòng liên hệ trước khi đến.',
};

export const SUPPORT_TYPES = [
    { value: 'product-advice', label: 'Tư vấn sản phẩm' },
    { value: 'order-support', label: 'Kiểm tra đơn hàng' },
    { value: 'return-warranty', label: 'Đổi trả hoặc bảo hành' },
    { value: 'feedback', label: 'Góp ý hoặc khiếu nại' },
    { value: 'partnership', label: 'Hợp tác kinh doanh' },
    { value: 'other', label: 'Nội dung khác' },
];

export const SUPPORT_CARDS = [
    {
        id: 'product-advice',
        title: 'Tư vấn sản phẩm',
        description:
            'Bạn chưa biết sản phẩm nào phù hợp với nhu cầu của mình? Đội ngũ Mộc Xoa sẽ hỗ trợ bạn tìm hiểu thông tin, cách sử dụng và lưu ý cần thiết.',
        button: 'Nhận tư vấn',
    },
    {
        id: 'order-support',
        title: 'Hỗ trợ đơn hàng',
        description:
            'Tra cứu trạng thái đơn hàng, thay đổi thông tin nhận hàng, kiểm tra thanh toán hoặc phản ánh vấn đề trong quá trình giao hàng.',
        button: 'Hỗ trợ đơn hàng',
    },
    {
        id: 'return-warranty',
        title: 'Đổi trả và bảo hành',
        description:
            'Tiếp nhận yêu cầu đổi trả, sản phẩm bị lỗi, thiếu sản phẩm hoặc không đúng với đơn hàng đã đặt.',
        button: 'Gửi yêu cầu đổi trả',
    },
    {
        id: 'partnership',
        title: 'Hợp tác cùng Mộc Xoa',
        description:
            'Dành cho nhà phân phối, đại lý, người sáng tạo nội dung, đối tác truyền thông hoặc các đơn vị muốn hợp tác kinh doanh.',
        button: 'Gửi đề nghị hợp tác',
    },
];

export const RESPONSE_COMMITMENTS = [
    {
        title: 'Phản hồi nhanh chóng',
        description:
            'Yêu cầu của khách hàng sẽ được tiếp nhận và phản hồi trong vòng 24 giờ làm việc.',
    },
    {
        title: 'Bảo mật thông tin',
        description:
            'Thông tin liên hệ chỉ được sử dụng để xác minh và hỗ trợ yêu cầu của khách hàng.',
    },
    {
        title: 'Theo dõi đến khi hoàn thành',
        description:
            'Mỗi yêu cầu đều được ghi nhận, phân loại và theo dõi cho đến khi có kết quả xử lý.',
    },
];

export const CONTACT_FAQS = [
    {
        question: 'Bao lâu tôi sẽ nhận được phản hồi?',
        answer:
            'Mộc Xoa thường phản hồi trong vòng 24 giờ làm việc. Những yêu cầu liên quan đến đơn hàng sẽ được ưu tiên xử lý sớm hơn.',
    },
    {
        question: 'Tôi cần cung cấp gì khi phản ánh đơn hàng?',
        answer:
            'Bạn nên cung cấp mã đơn hàng, số điện thoại đặt hàng, hình ảnh sản phẩm và mô tả vấn đề đang gặp phải.',
    },
    {
        question: 'Tôi có thể yêu cầu tư vấn trước khi mua không?',
        answer:
            'Có. Bạn có thể liên hệ qua hotline, Zalo hoặc form trên website để được tư vấn thông tin phù hợp.',
    },
    {
        question: 'Tôi muốn trở thành đại lý thì liên hệ ở đâu?',
        answer:
            'Bạn hãy chọn mục “Hợp tác kinh doanh” trong form hoặc gửi thông tin đến email dành cho đối tác.',
    },
];
