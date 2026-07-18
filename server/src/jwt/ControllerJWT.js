const jwt = require('jsonwebtoken');
const modelUser = require('../models/ModelUser');

const clearTokenCookie = (res) => {
    res.clearCookie('Token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
    });
};

const buildUserPayload = (findUser) => ({
    id: findUser._id,
    email: findUser.email,
    isAdmin: findUser.isAdmin,
    role: findUser.role,
    fullname: findUser.fullname,
    username: findUser.username,
    name: findUser.name,
    phone: findUser.phone,
    avatar: findUser.avatar || findUser.img || '',
    isActive: findUser.isActive,
});

const ControllerJWT = {
    verifyToken: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            // Nếu tài khoản bị khóa thì đá ra luôn
            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    verifyTokenAdmin: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            // Admin cũng nên kiểm tra isActive
            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản admin đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            if (findUser.isAdmin !== true) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập trang admin',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token admin không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    verifyTokenStaffOrAdmin: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            if (findUser.role !== 'staff' && findUser.isAdmin !== true) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền thực hiện thao tác này',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    verifyTokenStaff: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            if (findUser.role !== 'staff' && findUser.isAdmin !== true) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập trang Staff',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token staff không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    verifyTokenDoctor: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            if (findUser.role !== 'doctor') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập trang Bác sĩ',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token doctor không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    verifyTokenShipper: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Bạn cần đăng nhập lại',
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser.findOne({ email: decoded.email }).select('-password');
            }

            if (!findUser) {
                clearTokenCookie(res);
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy người dùng',
                });
            }

            if (findUser.isActive === false) {
                clearTokenCookie(res);
                return res.status(401).json({
                    success: false,
                    message: 'Tài khoản của bạn đã bị khóa',
                    code: 'ACCOUNT_LOCKED',
                });
            }

            if (findUser.role !== 'shipper') {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền truy cập trang shipper',
                });
            }

            req.user = buildUserPayload(findUser);
            next();
        } catch (error) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                message: 'Token shipper không hợp lệ hoặc đã hết hạn',
            });
        }
    },

    // Middleware mới để xác thực token nhưng không bắt buộc (dành cho chatbot)
    optionalVerifyToken: async (req, res, next) => {
        try {
            const token = req.cookies?.Token;

            if (!token) {
                req.user = null;
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let findUser = null;

            if (decoded?.id) {
                findUser = await modelUser.findById(decoded.id).select('-password');
            } else if (decoded?.email) {
                findUser = await modelUser
                    .findOne({
                        email: decoded.email,
                    })
                    .select('-password');
            }

            if (!findUser) {
                req.user = null;
                return next();
            }

            if (findUser.isActive === false) {
                req.user = null;
                return next();
            }

            req.user = buildUserPayload(findUser);

            return next();
        } catch (error) {
            req.user = null;
            return next();
        }
    },
};

module.exports = ControllerJWT;
