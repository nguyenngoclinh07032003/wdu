require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const modelProduct = require('../models/ModelProducts');
const ModelChatHistory = require('../models/ModelChatHistory');
const fs = require('fs');
const { runChatbotTool } = require('./chatbotTools');
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

const FACEBOOK_URL =
    process.env.FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61589897113612';
const ZALO_URL = process.env.ZALO_URL || 'https://zalo.me/0986003022';
const HOTLINE = process.env.HOTLINE || '0986 003 022';
// Warn instead of exiting; allow server to run even if key is absent.
if (!apiKey) {
    console.warn('⚠️ Warning: GEMINI_API_KEY missing in .env – chatbot functionality will be disabled');
}

if (apiKey && /[^\x00-\x7F]/.test(apiKey)) {
    console.warn('⚠️ Warning: Invalid Gemini API key – contains non-ASCII characters. Chatbot may not work properly');
}

console.log('✓ GEMINI_API_KEY loaded:', apiKey.slice(0, 10) + '...' + apiKey.slice(-10));

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite' });
console.log('✓ Gemini client initialized with model:', process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite');

const WEB_BASE = 'http://localhost:3000';
const UPLOAD_BASE = 'http://localhost:5001/uploads';

function normalizeProduct(p) {
    const firstImg = Array.isArray(p.img) ? p.img[0] : p.img;
    return {
        id: String(p._id || ''),
        name: String(p.name || ''),
        price: p.price ?? null,
        slug: String(p.slug || ''),
        img: firstImg ? `${UPLOAD_BASE}/${firstImg}` : null,
        url: p._id && p.slug ? `${WEB_BASE}/product/${p._id}/${p.slug}` : null,
    };
}
function escapeRegex(text = '') {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fileToGenerativePart(file) {
    if (!file) return null;

    const imageBuffer = fs.readFileSync(file.path);

    return {
        inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: file.mimetype,
        },
    };
}

function extractKeywords(question = '') {
    const text = String(question || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const stopWords = [
        'toi',
        'em',
        'anh',
        'chi',
        'can',
        'muon',
        'tim',
        'san',
        'pham',
        'co',
        'nao',
        'giup',
        'cho',
        've',
        'la',
        'va',
        'hoac',
        'khong',
        'a',
        'nhe',
        'nha',
        'minh',
        'dung',
    ];

    return text
        .split(/[^a-z0-9]+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 2 && !stopWords.includes(word))
        .slice(0, 8);
}

function buildProductFilter(question = '') {
    const rawQuestion = String(question || '').trim();
    const keywords = extractKeywords(rawQuestion);

    const orConditions = [];

    if (rawQuestion) {
        orConditions.push({
            name: {
                $regex: escapeRegex(rawQuestion),
                $options: 'i',
            },
        });
    }

    keywords.forEach((keyword) => {
        const regex = {
            $regex: escapeRegex(keyword),
            $options: 'i',
        };

        orConditions.push({ name: regex });
        orConditions.push({ title: regex });
        orConditions.push({ description: regex });
        orConditions.push({ trademark: regex });
    });

    return orConditions.length ? { $or: orConditions } : {};
}

async function findRelevantProducts(question = '') {
    const filter = buildProductFilter(question);

    let productsRaw = await modelProduct.find(filter).limit(30).lean();

    if (!productsRaw.length) {
        productsRaw = await modelProduct.find({}).limit(30).lean();
    }

    return productsRaw.map(normalizeProduct);
}

// Extract JSON action from chatbot response, if any
function extractJsonAction(text = '') {
    try {
        const match = String(text).match(/<action_json>([\s\S]*?)<\/action_json>/);

        if (!match) return null;

        return JSON.parse(match[1]);
    } catch (error) {
        return null;
    }
}

// Run chatbot tool based on action
async function generateWithRetry(content, retries = 2) {
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const currentModel = genAI.getGenerativeModel({ model: modelName });

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await currentModel.generateContent(content);
        } catch (error) {
            lastError = error;

            const status = error?.status;
            const shouldRetry = status === 503;

            if (!shouldRetry || attempt === retries) {
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }

    throw lastError;
}

// Main function to handle chatbot interactions
async function askQuestion(question, userId = null, sessionId = '', imageFile = null, userEmail = '') {
    if (!apiKey) {
        return "<p style='color:orange;'>Chatbot không khả dụng vì thiếu khóa API. Vui lòng thử lại sau khi cấu hình.</p>";
    }

    try {
        const cleanQuestion = String(question || '').trim();
        const lowerQuestion = cleanQuestion.toLowerCase();

        if (!cleanQuestion && !imageFile) {
            return '<p>Anh/chị vui lòng nhập nội dung hoặc gửi hình ảnh cần tư vấn nhé.</p>';
        }

        await ModelChatHistory.create({
            userId,
            sessionId,
            role: 'user',
            content: cleanQuestion || '[Khách hàng đã gửi hình ảnh]',
        });
        // ===== CONTACT ROUTER =====
        if (
            lowerQuestion.includes('facebook') ||
            lowerQuestion.includes('fanpage') ||
            lowerQuestion.includes('fb') ||
            lowerQuestion.includes('zalo') ||
            lowerQuestion.includes('liên hệ') ||
            lowerQuestion.includes('lien he') ||
            lowerQuestion.includes('hotline')
        ) {
            return `
        <div style="line-height:1.8">
            <h4>📞 Thông tin hỗ trợ khách hàng</h4>

            <p>☎️ Hotline: <b>${HOTLINE}</b></p>

            <p>
                💬 Zalo:
                <a href="${ZALO_URL}" target="_blank" rel="noopener noreferrer">
                    Liên hệ qua Zalo
                </a>
            </p>

            <p>
                📘 Facebook:
                <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">
                    Fanpage Mộc Xoa
                </a>
            </p>

            <p>❤️ Em luôn sẵn sàng hỗ trợ anh/chị.</p>
        </div>
    `;
        }
        // ===== INTENT ROUTER: không gọi Gemini cho đơn hàng / voucher / giỏ hàng =====
        if (
            lowerQuestion.includes('đơn hàng') ||
            lowerQuestion.includes('don hang') ||
            lowerQuestion.includes('order') ||
            lowerQuestion.includes('giao hàng') ||
            lowerQuestion.includes('giao hang')
        ) {
            const toolResult = await runChatbotTool({
                name: 'GET_MY_ORDERS',
                userId,
            });

            if (!toolResult.success) {
                return `<p>${toolResult.message}</p>`;
            }

            const orders = toolResult.data || [];

            if (!orders.length) {
                return '<p>Anh/chị chưa có đơn hàng nào.</p>';
            }

            return `
                <h4>📦 Đơn hàng gần đây của anh/chị</h4>
                ${orders
                    .map(
                        (order) => `
                            <div style="padding:8px 0;border-bottom:1px solid #eee;">
                                <b>Mã đơn:</b> ${order._id}<br/>
                                <b>Trạng thái:</b> ${order.status || order.orderStatus || 'Đang cập nhật'}<br/>
                                <b>Tổng tiền:</b> ${Number(
                                    order.total || order.totalPrice || order.subtotal || 0,
                                ).toLocaleString('vi-VN')}đ
                            </div>
                        `,
                    )
                    .join('')}
            `;
        }

        if (
            lowerQuestion.includes('voucher') ||
            lowerQuestion.includes('mã giảm giá') ||
            lowerQuestion.includes('ma giam gia') ||
            lowerQuestion.includes('khuyến mãi') ||
            lowerQuestion.includes('khuyen mai')
        ) {
            const toolResult = await runChatbotTool({
                name: 'GET_MY_VOUCHERS',
                userId,
            });

            if (!toolResult.success) {
                return `<p>${toolResult.message}</p>`;
            }

            const vouchers = toolResult.data || [];

            if (!vouchers.length) {
                return '<p>Hiện tại chưa có voucher khả dụng.</p>';
            }

            return `
                <h4>🎁 Voucher hiện có</h4>
                ${vouchers
                    .map(
                        (voucher) => `
                            <div style="padding:8px 0;border-bottom:1px solid #eee;">
                                <b>${voucher.code || voucher.name || 'Voucher'}</b><br/>
                                ${voucher.discount ? `Giảm: ${voucher.discount}` : ''}
                                ${voucher.percent ? `Giảm: ${voucher.percent}%` : ''}
                            </div>
                        `,
                    )
                    .join('')}
            `;
        }

        if (
            lowerQuestion.includes('giỏ hàng') ||
            lowerQuestion.includes('gio hang') ||
            lowerQuestion.includes('cart')
        ) {
            const toolResult = await runChatbotTool({
                name: 'GET_MY_CART',
                userId,
                email: userEmail,
            });

            if (!toolResult.success) {
                return `<p>${toolResult.message}</p>`;
            }

            const cart = toolResult.data;

            if (!cart || !cart.products || !cart.products.length) {
                return '<p>Giỏ hàng của anh/chị hiện đang trống.</p>';
            }

            return `
                <h4>🛒 Giỏ hàng của anh/chị</h4>
                ${cart.products
                    .map(
                        (item) => `
                            <div style="padding:8px 0;border-bottom:1px solid #eee;">
                                <b>${item.nameProduct || item.name || 'Sản phẩm'}</b><br/>
                                Số lượng: ${item.quantity || 1}<br/>
                                Giá: ${Number(item.price || 0).toLocaleString('vi-VN')}đ
                            </div>
                        `,
                    )
                    .join('')}
            `;
        }

        // ===== Chỉ tới đây mới gọi Gemini để tư vấn sản phẩm / phân tích ảnh =====
        const historyFilter = [];

        if (userId) historyFilter.push({ userId });
        if (sessionId) historyFilter.push({ sessionId });

        const history = historyFilter.length
            ? await ModelChatHistory.find({ $or: historyFilter }).sort({ createdAt: -1 }).limit(10).lean()
            : [];

        const historyText = history
            .reverse()
            .map((item) => {
                const role = item.role === 'user' ? 'Khách hàng' : 'XoaAI';
                return `${role}: ${item.content}`;
            })
            .join('\n');

        const products = await findRelevantProducts(cleanQuestion);

        const prompt = `
Bạn là XoaAI - trợ lý tư vấn bán hàng của Mộc Xoa.

NGUYÊN TẮC:
- Trả lời thân thiện, tự nhiên, xưng "em" với khách hàng.
- Luôn ưu tiên tư vấn sản phẩm phù hợp với nhu cầu khách hàng dựa trên dữ liệu JSON đã cho.
- Xưng "anh/chị" khi hỏi khách để tạo sự gần gũi, lịch sự.
- Nếu khách hỏi về triệu chứng hoặc vùng cơ thể, hãy gợi ý sản phẩm hỗ trợ thư giãn/chăm sóc phù hợp, không chẩn đoán bệnh lý y khoa.
- Chỉ tư vấn sản phẩm có trong dữ liệu JSON.
- Không bịa thêm sản phẩm ngoài danh sách.
- Nếu chưa đủ thông tin, hãy hỏi thêm nhu cầu, ngân sách, triệu chứng hoặc mục đích sử dụng.
- Trả lời bằng HTML gọn, không dùng markdown code fence.

LỊCH SỬ HỘI THOẠI:
${historyText || 'Chưa có lịch sử hội thoại.'}

SẢN PHẨM JSON:
${JSON.stringify(products, null, 2)}

CÂU HỎI HIỆN TẠI:
"${cleanQuestion}"

NẾU CÓ HÌNH ẢNH:
- Hãy quan sát hình ảnh khách gửi.
- Nếu ảnh là sản phẩm, hãy mô tả sản phẩm và gợi ý sản phẩm tương tự trong JSON.
- Nếu ảnh liên quan triệu chứng/vùng cơ thể, chỉ tư vấn sản phẩm hỗ trợ thư giãn/chăm sóc, không chẩn đoán bệnh.
- Không khẳng định bệnh lý y khoa.

YÊU CẦU OUTPUT:
- Trả lời bằng HTML.
- Nếu đề xuất sản phẩm, hiển thị dạng card đơn giản.
- Mỗi sản phẩm gồm tên, giá, ảnh nếu có, link nếu có.
- Không dùng <script>.
`;

        const imagePart = fileToGenerativePart(imageFile);

        const result = imagePart ? await generateWithRetry([prompt, imagePart]) : await generateWithRetry(prompt);

        let answer = result.response.text() || '';
        answer = answer.replace(/```(html|plaintext)?\n?/g, '').trim();

        await ModelChatHistory.create({
            userId,
            sessionId,
            role: 'assistant',
            content: answer,
        });

        return answer;
    } catch (error) {
        console.error('Lỗi khi xử lý câu hỏi:', error);

        if (error?.status === 429) {
            return "<p style='color:orange;'>XoaAI đang tạm quá tải do vượt giới hạn lượt dùng Gemini. Anh/chị vui lòng thử lại sau khoảng 1 phút nhé.</p>";
        }

        if (error?.status === 503) {
            return "<p style='color:orange;'>Gemini đang quá tải tạm thời. Anh/chị vui lòng thử lại sau ít phút nhé.</p>";
        }

        return "<p style='color:red;'>Xin lỗi, hiện tại tôi không thể xử lý yêu cầu của bạn. Vui lòng thử lại sau!</p>";
    }
}
module.exports = { askQuestion };
