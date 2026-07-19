const ModelUser = require('../models/ModelUser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const ModelPayment = require('../models/ModelPayment');
const ForgotPassword = require('../SendMail/ForgotPassword');
const { hasActiveDelivery, getActiveDeliveryCountMap } = require('../utils/shipperDelivery');
const { appendHistory, emitDeliveryUpdate } = require('../controllers/ControllerDeliveryStatus');
const { DELIVERY_STATUS, getStatusDisplay, syncLegacyStatus } = require('../utils/deliveryStatus');

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const proxyEnvKeys = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'];

function clearBrokenLocalProxy() {
    proxyEnvKeys.forEach((key) => {
        const value = process.env[key] || '';

        if (value.includes('127.0.0.1:9') || value.includes('localhost:9')) {
            delete process.env[key];
        }
    });
}

const FORGOT_COOLDOWN_MS = 60 * 1000;
const FORGOT_IP_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_IP_MAX = 10;
const RESET_OTP_MAX_ATTEMPTS = 5;

const forgotIpBucket = new Map();

function pruneForgotIpBucket(now = Date.now()) {
    for (const [ip, entry] of forgotIpBucket.entries()) {
        if (now - entry.windowStart > FORGOT_IP_WINDOW_MS) {
            forgotIpBucket.delete(ip);
        }
    }
}

function hitForgotIpLimit(ip) {
    const now = Date.now();
    pruneForgotIpBucket(now);
    const key = ip || 'unknown';
    const entry = forgotIpBucket.get(key) || { windowStart: now, count: 0 };
    if (now - entry.windowStart > FORGOT_IP_WINDOW_MS) {
        entry.windowStart = now;
        entry.count = 0;
    }
    entry.count += 1;
    forgotIpBucket.set(key, entry);
    return entry.count > FORGOT_IP_MAX;
}

async function assignOrdersToShipperBatch(req, res, shipperId, rawOrderIds) {
    const orderIds = [...new Set(rawOrderIds.map((id) => String(id || '').trim()).filter(Boolean))];

    if (!shipperId || orderIds.length === 0) {
        return res.status(400).json({
            message: 'Thiếu orderId hoặc shipperId !!!',
        });
    }

    const shipper = await ModelUser.findById(shipperId);

    if (!shipper) {
        return res.status(404).json({
            message: 'Shipper không tồn tại !!!',
        });
    }

    if (shipper.role !== 'shipper') {
        return res.status(400).json({
            message: 'Người dùng này không phải shipper !!!',
        });
    }

    if (shipper.isActive === false) {
        return res.status(400).json({
            message: 'Shipper đang bị khóa, không thể gán đơn !!!',
        });
    }

    const assignedOrders = [];
    const failedOrders = [];
    const actor = {
        userId: req.user?.id || null,
        role: req.user?.isAdmin ? 'admin' : req.user?.role || 'admin',
    };

    const addFailedOrder = (targetOrderId, status, message, order = null) => {
        failedOrders.push({
            orderId: targetOrderId,
            orderCode: order?.gatewayOrderId || targetOrderId,
            status,
            message,
        });
    };

    for (const targetOrderId of orderIds) {
        try {
            const order = await ModelPayment.findById(targetOrderId);

            if (!order) {
                addFailedOrder(targetOrderId, 404, 'Đơn hàng không tồn tại !!!');
                continue;
            }

            if (!['pending', 'confirmed'].includes(order.status)) {
                addFailedOrder(targetOrderId, 400, 'Chỉ gán được đơn đang chờ hoặc đã xác nhận !!!', order);
                continue;
            }

            const previousStatus = order.deliveryStatus || '';
            const claimed = await ModelPayment.findOneAndUpdate(
                {
                    _id: targetOrderId,
                    status: { $in: ['pending', 'confirmed'] },
                    $or: [{ shipperId: null }, { shipperId: { $exists: false } }],
                },
                {
                    $set: {
                        shipperId: shipper._id,
                        shipperName: shipper.fullname,
                        assignedAt: new Date(),
                        status: 'confirmed',
                        deliveryStatus: DELIVERY_STATUS.ASSIGNED,
                        deliveryAttempt: 0,
                        updatedAt: new Date(),
                    },
                },
                { new: true },
            );

            if (!claimed) {
                const existing = await ModelPayment.findById(targetOrderId);
                if (!existing) {
                    addFailedOrder(targetOrderId, 404, 'Đơn hàng không tồn tại !!!');
                    continue;
                }

                if (existing.shipperId) {
                    addFailedOrder(
                        targetOrderId,
                        400,
                        existing.shipperName
                            ? `Đơn đã được gán cho ${existing.shipperName}.`
                            : 'Đơn đã được gán cho shipper khác.',
                        existing,
                    );
                    continue;
                }

                addFailedOrder(targetOrderId, 400, 'Không thể gán đơn ở trạng thái hiện tại', existing);
                continue;
            }

            syncLegacyStatus(claimed);

            await appendHistory({
                order: claimed,
                previousStatus: previousStatus || '',
                newStatus: DELIVERY_STATUS.ASSIGNED,
                attemptNumber: 0,
                note: `Gán cho shipper ${shipper.fullname}`,
                actor,
            });

            emitDeliveryUpdate(req, claimed);
            assignedOrders.push(claimed);
        } catch (error) {
            console.error('AssignOrderToShipper item error:', targetOrderId, error);
            addFailedOrder(targetOrderId, 400, 'Không thể gán đơn này');
        }
    }

    const assignedCount = assignedOrders.length;
    const failedCount = failedOrders.length;
    const message =
        assignedCount === 0
            ? `${failedCount} đơn chưa gán được.`
            : failedCount > 0
              ? `Đã gán ${assignedCount} đơn cho ${shipper.fullname}. ${failedCount} đơn chưa gán được.`
              : `Đã gán ${assignedCount} đơn cho ${shipper.fullname} !!!`;

    return res.status(assignedCount > 0 ? 200 : 400).json({
        message,
        assignedCount,
        failedCount,
        assignedOrders,
        failedOrders,
    });
}

class ControllerUser {
    async Register(req, res) {
        try {
            const { fullname, password, email, phone, role } = req.body;

            if (!fullname || !password || !email || !phone) {
                return res.status(400).json({
                    message: 'Vui lòng nhập đầy đủ thông tin !!!',
                });
            }

            const dataUser = await ModelUser.findOne({ email });
            if (dataUser) {
                return res.status(403).json({
                    message: 'Người dùng đã tồn tại !!!',
                });
            }

            const hash = await bcrypt.hash(password, 10);

            const newUser = new ModelUser({
                fullname,
                password: hash,
                email,
                phone,
                avatar: '',
                surplus: 0,
                isActive: true,
            });

            await newUser.save();

            return res.status(200).json({
                message: 'Đăng ký thành công !!!',
            });
        } catch (error) {
            console.error('Register error:', error);
            return res.status(500).json({
                message: 'Đã xảy ra lỗi !!!',
            });
        }
    }

    async Login(req, res) {
        try {
            const { password, email } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    message: 'Vui lòng nhập email và mật khẩu !!!',
                });
            }

            const dataUser = await ModelUser.findOne({ email });
            if (!dataUser) {
                return res.status(401).json({
                    message: 'Email hoặc mật khẩu không chính xác !!!',
                });
            }

            if (dataUser.isActive === false) {
                return res.status(403).json({
                    message: 'Tài khoản của bạn đã bị khóa !!!',
                });
            }

            const match = await bcrypt.compare(password, dataUser.password);
            if (!match) {
                return res.status(401).json({
                    message: 'Email hoặc mật khẩu không chính xác !!!',
                });
            }

            const admin = dataUser.isAdmin || false;

            const token = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: process.env.EXPIRES_IN || '15m',
            });

            const refreshToken = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            });

            res.cookie('Token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
            });

            res.cookie('logged', '1', {
                httpOnly: false,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({
                message: 'Đăng nhập thành công !!!',
                user: {
                    id: dataUser._id,
                    fullname: dataUser.fullname,
                    email: dataUser.email,
                    phone: dataUser.phone,
                    avatar: dataUser.avatar,
                    surplus: dataUser.surplus,
                    isAdmin: dataUser.isAdmin,
                    role: dataUser.role,
                    isActive: dataUser.isActive,
                },
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async GoogleLogin(req, res) {
        try {
            const { credential, clientId } = req.body;

            if (!credential) {
                return res.status(400).json({
                    message: 'Token Google không hợp lệ !!!',
                });
            }

            const googleClientIds = (
                process.env.GOOGLE_LOGIN_CLIENT_ID ||
                process.env.GOOGLE_CLIENT_ID ||
                process.env.REACT_APP_GOOGLE_CLIENT_ID ||
                ''
            )
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);

            if (clientId && !googleClientIds.includes(clientId)) {
                googleClientIds.push(clientId);
            }

            if (!googleClientIds.length) {
                return res.status(500).json({
                    message: 'Google OAuth client ID chưa được cấu hình !!!',
                });
            }

            clearBrokenLocalProxy();

            const client = new OAuth2Client(googleClientIds[0]);
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: googleClientIds,
            });
            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                return res.status(400).json({
                    message: 'Không lấy được thông tin từ Google !!!',
                });
            }

            if (payload.email_verified === false) {
                return res.status(400).json({
                    message: 'Email Google chÆ°a Ä‘Æ°á»£c xÃ¡c minh !!!',
                });
            }

            const email = payload.email;
            const fullname = payload.name || payload.email;
            const avatar = payload.picture || '';

            let dataUser = await ModelUser.findOne({ email });

            if (dataUser && dataUser.isActive === false) {
                return res.status(403).json({
                    message: 'Tài khoản của bạn đã bị khóa !!!',
                });
            }

            if (!dataUser) {
                const password = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
                dataUser = new ModelUser({
                    fullname,
                    password,
                    email,
                    avatar,
                    surplus: 0,
                    isActive: true,
                    isGoogleAccount: true,
                });

                await dataUser.save();
            } else {
                dataUser.isGoogleAccount = true;
                dataUser.lastLoginAt = new Date();

                if (!dataUser.avatar && avatar) {
                    dataUser.avatar = avatar;
                }

                await dataUser.save();
            }

            const admin = dataUser.isAdmin || false;
            const token = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: process.env.EXPIRES_IN || '15m',
            });
            const refreshToken = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            });

            res.cookie('Token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
            });

            res.cookie('logged', '1', {
                httpOnly: false,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({
                message: 'Đăng nhập Google thành công !!!',
                user: {
                    id: dataUser._id,
                    fullname: dataUser.fullname,
                    email: dataUser.email,
                    phone: dataUser.phone,
                    avatar: dataUser.avatar,
                    surplus: dataUser.surplus,
                    isAdmin: dataUser.isAdmin,
                    role: dataUser.role,
                    isActive: dataUser.isActive,
                    role: dataUser.role,
                },
            });
        } catch (error) {
            const detail = error?.message || 'Unknown Google login error';
            console.error('GoogleLogin error:', {
                message: detail,
                code: error?.code,
                name: error?.name,
            });
            return res.status(500).json({
                message: `Loi khi dang nhap bang Google: ${detail}`,
            });
            return res.status(500).json({
                message: 'Lỗi khi đăng nhập bằng Google !!!',
            });
        }
    }
    async FacebookLogin(req, res) {
        try {
            const { accessToken } = req.body;

            if (!accessToken) {
                return res.status(400).json({
                    message: 'Token Facebook không hợp lệ !!!',
                });
            }

            // For local development, the profile request below is enough to validate
            // that Facebook issued a usable user access token.
            const profileRes = await axios.get('https://graph.facebook.com/me', {
                params: {
                    fields: 'id,name,picture.type(large)',
                    access_token: accessToken,
                },
            });

            const profile = profileRes.data || {};
            if (!profile.id) {
                return res.status(400).json({
                    message: 'Không lấy được thông tin từ Facebook !!!',
                });
            }

            const email = profile.email || `${profile.id}@facebook.local`;
            const fullname = profile.name || email;
            const avatar = profile.picture?.data?.url || '';

            let dataUser = await ModelUser.findOne({ email });

            if (dataUser && dataUser.isActive === false) {
                return res.status(403).json({
                    message: 'Tài khoản của bạn đã bị khóa !!!',
                });
            }

            if (!dataUser) {
                const password = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
                dataUser = new ModelUser({
                    fullname,
                    password,
                    email,
                    avatar,
                    surplus: 0,
                    isActive: true,
                    isFacebookAccount: true,
                });

                await dataUser.save();
            }

            const admin = dataUser.isAdmin || false;
            const token = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: process.env.EXPIRES_IN || '15m',
            });
            const refreshToken = jwt.sign({ id: dataUser._id, email: dataUser.email, admin }, process.env.JWT_SECRET, {
                expiresIn: '30d',
            });

            res.cookie('Token', token, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
            });

            res.cookie('logged', '1', {
                httpOnly: false,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({
                message: 'Đăng nhập Facebook thành công !!!',
                user: {
                    id: dataUser._id,
                    fullname: dataUser.fullname,
                    email: dataUser.email,
                    phone: dataUser.phone,
                    avatar: dataUser.avatar,
                    surplus: dataUser.surplus,
                    isAdmin: dataUser.isAdmin,
                    role: dataUser.role,
                    isActive: dataUser.isActive,
                },
            });
        } catch (error) {
            console.error('FacebookLogin error:', error?.response?.data || error.message);
            return res.status(500).json({
                message: 'Lỗi khi đăng nhập bằng Facebook !!!',
            });
        }
    }



    async GetUser(req, res) {
        try {
            const email = req.user?.email;

            if (!email) {
                return res.status(401).json({
                    message: 'Có lỗi xảy ra !!!',
                });
            }

            const dataUser = await ModelUser.findOne({ email }).select('-password -resetOtp');

            if (!dataUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            const payload = dataUser.toObject();
            payload.birthday = payload.birthday || payload.brirthday || null;
            delete payload.brirthday;

            return res.status(200).json(payload);
        } catch (error) {
            console.error('GetUser error:', error);
            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async Logout(req, res) {
        try {
            res.clearCookie('Token', {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
            });

            res.clearCookie('logged', {
                httpOnly: false,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
            });

            res.clearCookie('refreshToken', {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
            });

            return res.status(200).json({
                message: 'Đăng xuất thành công !!!',
            });
        } catch (error) {
            console.error('Logout error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async GetOrder(req, res) {
        try {
            const data = await ModelPayment.find({}).sort({ updatedAt: -1, createdAt: -1 });
            return res.status(200).json(data);
        } catch (error) {
            console.error('GetOrder error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async ForgotPassword(req, res) {
        try {
            const email = String(req.body.email || '')
                .trim()
                .toLowerCase();

            if (!email) {
                return res.status(400).json({
                    message: 'Vui lòng nhập email !!!',
                });
            }

            const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
            if (hitForgotIpLimit(String(clientIp))) {
                return res.status(429).json({
                    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
                });
            }

            // Không tiết lộ email có tồn tại hay không
            const genericOk = {
                message: 'Nếu email tồn tại, mã OTP đã được gửi (kiểm tra hộp thư).',
            };

            const dataUser = await ModelUser.findOne({ email });
            if (!dataUser) {
                return res.status(200).json(genericOk);
            }

            if (
                dataUser.resetOtpLastRequestAt &&
                Date.now() - new Date(dataUser.resetOtpLastRequestAt).getTime() < FORGOT_COOLDOWN_MS
            ) {
                return res.status(200).json(genericOk);
            }

            const secretKey = process.env.JWT_SECRET;
            const otpExpiry = '15m';

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const token = jwt.sign({ email, otp }, secretKey, {
                expiresIn: otpExpiry,
            });

            const hashedOtp = await bcrypt.hash(otp, 10);

            await ForgotPassword(email, token, otp);

            await ModelUser.updateOne(
                { email },
                {
                    resetOtp: hashedOtp,
                    resetOtpExpiry: new Date(Date.now() + 15 * 60 * 1000),
                    resetOtpAttempts: 0,
                    resetOtpLastRequestAt: new Date(),
                },
            );

            return res.status(200).json(genericOk);
        } catch (error) {
            console.error('ForgotPassword error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async ResetPassword(req, res) {
        try {
            const email = String(req.body.email || '')
                .trim()
                .toLowerCase();
            const { otp, newPassword } = req.body;

            if (!email || !otp || !newPassword) {
                return res.status(400).json({
                    message: 'Email, OTP và mật khẩu mới là bắt buộc',
                });
            }

            const user = await ModelUser.findOne({ email });
            if (!user || !user.resetOtp) {
                return res.status(401).json({
                    message: 'OTP không hợp lệ hoặc đã hết hạn',
                });
            }

            if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
                await ModelUser.updateOne(
                    { email },
                    { resetOtp: '', resetOtpExpiry: null, resetOtpAttempts: 0 },
                );
                return res.status(401).json({
                    message: 'OTP đã hết hạn',
                });
            }

            if ((user.resetOtpAttempts || 0) >= RESET_OTP_MAX_ATTEMPTS) {
                await ModelUser.updateOne(
                    { email },
                    { resetOtp: '', resetOtpExpiry: null, resetOtpAttempts: 0 },
                );
                return res.status(429).json({
                    message: 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.',
                });
            }

            const otpOk = await bcrypt.compare(String(otp), user.resetOtp);
            if (!otpOk) {
                await ModelUser.updateOne({ email }, { $inc: { resetOtpAttempts: 1 } });
                return res.status(401).json({
                    message: 'OTP không chính xác',
                });
            }

            const hashPassword = await bcrypt.hash(newPassword, 10);

            await ModelUser.updateOne(
                { email },
                {
                    password: hashPassword,
                    resetOtp: '',
                    resetOtpExpiry: null,
                    resetOtpAttempts: 0,
                },
            );

            return res.status(200).json({
                message: 'Khôi phục mật khẩu thành công !!!',
            });
        } catch (error) {
            console.error('ResetPassword error:', error);
            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async getAllUser(req, res) {
        try {
            const data = await ModelUser.find({}).select('-password -resetOtp').lean();
            const shipperIds = data.filter((user) => user.role === 'shipper').map((user) => user._id);
            const activeDeliveryMap = await getActiveDeliveryCountMap(shipperIds);

            const enriched = data.map((user) => {
                if (user.role !== 'shipper') {
                    return user;
                }

                const activeDeliveryCount = activeDeliveryMap[String(user._id)] || 0;

                return {
                    ...user,
                    activeDeliveryCount,
                    hasActiveDelivery: activeDeliveryCount > 0,
                };
            });

            return res.status(200).json(enriched);
        } catch (error) {
            console.error('getAllUser error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }
    // lấy danh sách shipper để quản lý
    async GetAllShipper(req, res) {
        try {
            const data = await ModelUser.find({ role: 'shipper' }).select('-password -resetOtp');

            return res.status(200).json(data);
        } catch (error) {
            console.error('GetAllShipper error:', error);
            return res.status(500).json({
                message: 'Lỗi lấy danh sách shipper !!!',
            });
        }
    }
    async DeleteUser(req, res) {
        try {
            const { id } = req.query;
            const currentUserEmail = req.user?.email;

            if (!id) {
                return res.status(400).json({
                    message: 'Thiếu id người dùng !!!',
                });
            }

            const findUser = await ModelUser.findById(id);
            if (!findUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            const currentUser = currentUserEmail ? await ModelUser.findOne({ email: currentUserEmail }) : null;

            if (currentUser && currentUser._id.toString() === id) {
                return res.status(400).json({
                    message: 'Không thể xóa chính mình !!!',
                });
            }

            if (findUser.isAdmin === true) {
                return res.status(400).json({
                    message: 'Không thể xóa Admin !!!',
                });
            }

            await ModelUser.deleteOne({ _id: id });

            return res.status(200).json({
                message: 'Xóa người dùng thành công !!!',
            });
        } catch (error) {
            console.error('DeleteUser error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async UpdateStatusUser(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            const currentUserEmail = req.user?.email;

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({
                    message: 'Trạng thái không hợp lệ !!!',
                });
            }

            const findUser = await ModelUser.findById(id);

            if (!findUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            const currentUser = currentUserEmail ? await ModelUser.findOne({ email: currentUserEmail }) : null;

            if (currentUser && currentUser._id.toString() === id) {
                return res.status(400).json({
                    message: 'Không thể tự chỉnh sửa trạng thái tài khoản của chính mình !!!',
                });
            }

            if (isActive === false && findUser.role === 'shipper') {
                const delivering = await hasActiveDelivery(findUser._id);

                if (delivering) {
                    return res.status(400).json({
                        message:
                            'Không thể khóa shipper đang giao hàng. Vui lòng đợi shipper hoàn thành hoặc xử lý xong các đơn được gán.',
                        code: 'SHIPPER_DELIVERING',
                    });
                }
            }

            findUser.isActive = isActive;
            findUser.updatedAt = Date.now();
            await findUser.save();

            return res.status(200).json({
                message: isActive ? 'Mở khóa tài khoản thành công !!!' : 'Khóa tài khoản thành công !!!',
                user: findUser,
            });
        } catch (error) {
            console.error('UpdateStatusUser error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async UpdateUser(req, res) {
        try {
            const { id } = req.params;
            const { fullname, phone, email, role, isAdmin } = req.body;

            const findUser = await ModelUser.findById(id);

            if (!findUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            //nếu muốn chặn sửa chính mình thì có thể thêm ở đây
            const currentUserEmail = req.user?.email;
            const currentUser = currentUserEmail ? await ModelUser.findOne({ email: currentUserEmail }) : null;
            if (currentUser && currentUser._id.toString() === id) {
                return res.status(400).json({
                    message: 'Không thể tự sửa chức vụ của chính mình !!!',
                });
            }

            if (fullname !== undefined) findUser.fullname = fullname;
            if (phone !== undefined) findUser.phone = phone;
            if (email !== undefined) findUser.email = email;

            // cập nhật role
            if (role !== undefined) {
                const validRoles = ['user', 'admin', 'shipper', 'staff', 'doctor'];

                if (!validRoles.includes(role)) {
                    return res.status(400).json({
                        message: 'Chức vụ không hợp lệ !!!',
                    });
                }

                findUser.role = role;

                // giữ tương thích code cũ
                findUser.isAdmin = role === 'admin';
            }

            findUser.updatedAt = Date.now();

            await findUser.save();

            return res.status(200).json({
                message: 'Cập nhật người dùng thành công !!!',
                user: findUser,
            });
        } catch (error) {
            console.error('UpdateUser error:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    message: 'Email đã tồn tại !!!',
                });
            }

            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async NotifyUser(req, res) {
        try {
            const { id } = req.params;
            const { message } = req.body;

            const user = await ModelUser.findById(id);

            if (!user) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            if (user.isAdmin) {
                return res.status(403).json({
                    message: 'Không gửi thông báo cho Admin ở màn này !!!',
                });
            }

            return res.status(200).json({
                message: 'Gửi thông báo thành công !!!',
                data: {
                    userId: user._id,
                    email: user.email,
                    notifyMessage: message || 'Bạn có một thông báo mới từ quản trị viên.',
                },
            });
        } catch (error) {
            console.error('NotifyUser error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    async RefreshToken(req, res) {
        try {
            const token = req.cookies;

            if (!token?.refreshToken) {
                return res.status(401).json({
                    message: 'Không có refresh token',
                });
            }

            const decoded = jwt.verify(token.refreshToken, process.env.JWT_SECRET);

            const user = await ModelUser.findOne({ email: decoded.email });

            if (!user) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            if (user.isActive === false) {
                return res.status(403).json({
                    message: 'Tài khoản của bạn đã bị khóa !!!',
                });
            }

            const newToken = jwt.sign({ email: decoded.email, admin: decoded.admin }, process.env.JWT_SECRET, {
                expiresIn: process.env.EXPIRES_IN || '15m',
            });

            res.cookie('Token', newToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'None' : 'Lax',
                maxAge: 15 * 60 * 1000,
            });

            return res.status(200).json({
                message: 'Làm mới token thành công !!!',
                email: decoded.email,
                admin: decoded.admin,
            });
        } catch (error) {
            console.error('RefreshToken error:', error);
            return res.status(401).json({
                message: 'Refresh token không hợp lệ hoặc đã hết hạn',
            });
        }
    }

    async UpdateProfile(req, res) {
        try {
            const emailFromToken = req.user?.email;

            if (!emailFromToken) {
                return res.status(401).json({
                    message: 'Không xác thực được người dùng',
                });
            }

            const currentUser = await ModelUser.findOne({ email: emailFromToken });

            if (!currentUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại',
                });
            }

            if (currentUser.isActive === false) {
                return res.status(403).json({
                    message: 'Tài khoản của bạn đã bị khóa !!!',
                });
            }

            const { fullname, phone, email, surplus } = req.body;
            const updateData = {};

            if (fullname !== undefined) updateData.fullname = fullname;
            if (phone !== undefined) updateData.phone = phone;
            if (email !== undefined) updateData.email = email;
            if (surplus !== undefined) updateData.surplus = surplus;
            updateData.updatedAt = Date.now();

            if (req.file) {
                const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
                updateData.avatar = fileUrl;
            }

            const updatedUser = await ModelUser.findOneAndUpdate({ email: emailFromToken }, updateData, {
                new: true,
            }).select('-password -resetOtp');

            if (!updatedUser) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại',
                });
            }

            return res.status(200).json({
                message: 'Cập nhật tài khoản thành công !!!',
                user: updatedUser,
            });
        } catch (error) {
            console.error('Error in UpdateProfile:', error);

            if (error.code === 11000) {
                return res.status(400).json({
                    message: 'Email đã tồn tại !!!',
                });
            }

            return res.status(500).json({
                message: 'Cập nhật tài khoản thất bại',
            });
        }
    }
    async GetUserById(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    message: 'Thiếu id người dùng !!!',
                });
            }

            const user = await ModelUser.findById(id).select('-password -resetOtp').lean();

            if (!user) {
                return res.status(404).json({
                    message: 'Người dùng không tồn tại !!!',
                });
            }

            const orders = await ModelPayment.find({ user_Id: id }).sort({ createdAt: -1 }).lean();

            const totalOrders = orders.length;

            const completedOrders = orders.filter((item) => {
                const status = String(item?.status || '')
                    .trim()
                    .toLowerCase();

                if (status === 'completed') return true;
                if (item?.tinhtrang === true) return true;

                return false;
            }).length;

            const totalSpent = orders.reduce((sum, item) => {
                return sum + Number(item?.sumprice || 0);
            }, 0);

            const recentOrders = orders.slice(0, 5).map((item) => ({
                _id: item._id,
                orderCode: item?.gatewayOrderId || item?._id,
                createdAt: item?.createdAt,
                sumprice: item?.sumprice || 0,
                status: item?.status || '',
                tinhtrang: item?.tinhtrang,
                trangthai: item?.trangthai,
                paymentMethod: item?.paymentMethod || '',
                paymentStatus: item?.paymentStatus || '',
            }));

            return res.status(200).json({
                ...user,
                totalOrders,
                completedOrders,
                totalSpent,
                recentOrders,
            });
        } catch (error) {
            console.error('GetUserById error:', error);
            return res.status(500).json({
                message: 'Lỗi server !!!',
            });
        }
    }

    // Lấy danh sách đơn hàng của shipper

    async AssignOrderToShipper(req, res) {
        try {
            const { orderId } = req.params;
            const { shipperId, orderIds } = req.body;

            if (Array.isArray(orderIds)) {
                return assignOrdersToShipperBatch(req, res, shipperId, orderIds);
            }

            if (!orderId || !shipperId) {
                return res.status(400).json({
                    message: 'Thiếu orderId hoặc shipperId !!!',
                });
            }

            const shipper = await ModelUser.findById(shipperId);

            if (!shipper) {
                return res.status(404).json({
                    message: 'Shipper không tồn tại !!!',
                });
            }

            if (shipper.role !== 'shipper') {
                return res.status(400).json({
                    message: 'Người dùng này không phải shipper !!!',
                });
            }

            if (shipper.isActive === false) {
                return res.status(400).json({
                    message: 'Shipper đang bị khóa, không thể gán đơn !!!',
                });
            }

            const order = await ModelPayment.findById(orderId);

            if (!order) {
                return res.status(404).json({
                    message: 'Đơn hàng không tồn tại !!!',
                });
            }

            if (!['pending', 'confirmed'].includes(order.status)) {
                return res.status(400).json({
                    message: 'Chỉ gán được đơn đang chờ hoặc đã xác nhận !!!',
                });
            }

            // Atomic first-assign — tránh 2 staff ghi đè nhau
            const previousStatus = order.deliveryStatus || '';
            const claimed = await ModelPayment.findOneAndUpdate(
                {
                    _id: orderId,
                    status: { $in: ['pending', 'confirmed'] },
                    $or: [{ shipperId: null }, { shipperId: { $exists: false } }],
                },
                {
                    $set: {
                        shipperId: shipper._id,
                        shipperName: shipper.fullname,
                        assignedAt: new Date(),
                        status: 'confirmed',
                        deliveryStatus: DELIVERY_STATUS.ASSIGNED,
                        deliveryAttempt: 0,
                        updatedAt: new Date(),
                    },
                },
                { new: true },
            );

            if (!claimed) {
                const existing = await ModelPayment.findById(orderId);
                if (!existing) {
                    return res.status(404).json({ message: 'Đơn hàng không tồn tại !!!' });
                }
                if (existing.shipperId) {
                    return res.status(400).json({
                        message: existing.shipperName
                            ? `Đơn đã được gán cho ${existing.shipperName}.`
                            : 'Đơn đã được gán cho shipper khác.',
                    });
                }
                return res.status(400).json({ message: 'Không thể gán đơn ở trạng thái hiện tại' });
            }

            syncLegacyStatus(claimed);

            await appendHistory({
                order: claimed,
                previousStatus: previousStatus || '',
                newStatus: DELIVERY_STATUS.ASSIGNED,
                attemptNumber: 0,
                note: `Gán cho shipper ${shipper.fullname}`,
                actor: {
                    userId: req.user?.id || null,
                    role: req.user?.isAdmin ? 'admin' : req.user?.role || 'admin',
                },
            });

            emitDeliveryUpdate(req, claimed);

            return res.status(200).json({
                message: `Đã gán đơn cho ${shipper.fullname} !!!`,
                order: claimed,
                statusDisplay: getStatusDisplay(claimed),
            });
        } catch (error) {
            console.error('AssignOrderToShipper error:', error);
            return res.status(500).json({
                message: 'Lỗi gán đơn cho shipper !!!',
            });
        }
    }
}

module.exports = new ControllerUser();
