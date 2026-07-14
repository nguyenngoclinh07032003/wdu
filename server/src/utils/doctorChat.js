require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = (process.env.DOCTOR_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI
    ? genAI.getGenerativeModel({
          model: process.env.DOCTOR_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      })
    : null;

async function askDoctorQuestion(question, doctorContext = {}) {
    const cleanQuestion = String(question || '').trim();

    if (!cleanQuestion) {
        return 'Vui lòng nhập câu hỏi chuyên môn.';
    }

    if (!model) {
        return 'Hệ thống Q&A tạm thời chưa khả dụng (thiếu DOCTOR_GEMINI_API_KEY). Vui lòng liên hệ quản trị viên.';
    }

    const specialty = doctorContext.specialty || 'Y tế tổng quát';
    const hospital = doctorContext.hospital || 'Chưa cập nhật';

    const prompt = `
Bạn là trợ lý chuyên môn y tế nội bộ cho bác sĩ trên nền tảng Healthcare Healthcare.

THÔNG TIN BÁC SĨ:
- Chuyên khoa: ${specialty}
- Cơ sở: ${hospital}

NGUYÊN TẮC:
- Trả lời ngắn gọn, chuyên nghiệp, bằng tiếng Việt.
- Hỗ trợ tham khảo chuyên môn, hướng dẫn sử dụng thiết bị y tế/chăm sóc sức khỏe tại nhà.
- Không thay thế chẩn đoán lâm sàng trực tiếp; nhắc bác sĩ cân nhắc bối cảnh bệnh nhân.
- Không bịa thông tin y khoa không có căn cứ.
- Trả lời dạng HTML đơn giản (p, ul, li, b), không dùng markdown code fence.

CÂU HỎI CỦA BÁC SĨ:
"${cleanQuestion}"
`;

    try {
        const result = await model.generateContent(prompt);
        let answer = result.response.text() || '';
        answer = answer.replace(/```(html|plaintext)?\n?/g, '').trim();
        return answer || 'Không nhận được câu trả lời. Vui lòng thử lại.';
    } catch (error) {
        console.error('askDoctorQuestion error:', error);
        return 'Hệ thống đang quá tải. Vui lòng thử lại sau.';
    }
}

module.exports = { askDoctorQuestion };
