require('./Config/loadEnv');
const express = require('express');
const app = express();
const route = require('./routes');
const cookieParser = require('cookie-parser');
const cookie = require('cookie');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const connectDB = require('./Config/db');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const { askQuestion } = require('./utils/chatbot');
const startReminderMailJob = require('./jobs/reminderMailJob');
const backfillDeliveryStatuses = require('./jobs/backfillDeliveryStatus');
const multer = require('multer');
const ModelUser = require('./models/ModelUser');

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
const uploadDirs = [
    path.join(__dirname, '..', 'uploads'),
    path.join(__dirname, 'uploads'),
];

// ===== SOCKET.IO =====
if (process.env.NODE_ENV === 'production' && !process.env.REACT_APP_URL) {
    console.error('FATAL: REACT_APP_URL is required in production');
    process.exit(1);
}

const corsOrigin = process.env.REACT_APP_URL || 'http://localhost:3000';

const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.set('io', io);

function canJoinSocketRoom(user, room) {
    if (!user || !room) return false;

    if (room === 'doctor-inbox') return user.role === 'doctor';
    if (room === 'staff-inbox') return user.role === 'staff' || user.isAdmin;
    if (room === 'role:admin') return !!user.isAdmin;
    if (room === 'role:staff') return user.role === 'staff' || user.isAdmin;

    if (room.startsWith('user:')) return room === `user:${user.id}`;
    if (room.startsWith('shipper:')) {
        return user.role === 'shipper' && room === `shipper:${user.id}`;
    }
    // order:<id> — chỉ admin/staff (shipper/user dùng room riêng)
    if (room.startsWith('order:')) return user.isAdmin || user.role === 'staff';

    return false;
}

io.use(async (socket, next) => {
    try {
        const raw = socket.request.headers.cookie || '';
        const parsed = cookie.parse(raw);
        const token = parsed.Token;
        if (!token) {
            return next(new Error('Unauthorized'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        let findUser = null;
        if (decoded?.id) {
            findUser = await ModelUser.findById(decoded.id).select('role isAdmin isActive');
        } else if (decoded?.email) {
            findUser = await ModelUser.findOne({ email: decoded.email }).select('role isAdmin isActive');
        }

        if (!findUser || findUser.isActive === false) {
            return next(new Error('Unauthorized'));
        }

        socket.user = {
            id: String(findUser._id),
            role: findUser.role,
            isAdmin: !!findUser.isAdmin,
        };
        return next();
    } catch (error) {
        return next(new Error('Unauthorized'));
    }
});

// ===== MIDDLEWARE =====
app.use(cookieParser());
app.use(
    cors({
        origin: corsOrigin,
        credentials: true,
    }),
);
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use(bodyParser.json({ limit: '5mb' }));

app.use((err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
        return res.status(413).json({
            message: 'Dữ liệu gửi quá lớn. Vui lòng chọn ảnh nhỏ hơn hoặc bỏ ảnh đính kèm.',
        });
    }

    return next(err);
});
app.use(express.static(path.join(__dirname, '')));

// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        time: new Date(),
    });
});

// upload cache and private upload guard
app.use('/uploads', (req, res, next) => {
    const p = String(req.path || '');
    if (
        p.startsWith('/doctor-certificates') ||
        p.includes('doctor-certificates') ||
        p.startsWith('/delivery-evidence') ||
        p.includes('delivery-evidence')
    ) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.set('Cache-Control', 'public, max-age=31536000');
    next();
});

const missingUploadPlaceholder = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="No image">
  <rect width="640" height="640" rx="56" fill="#f4f9ef"/>
  <circle cx="320" cy="246" r="78" fill="#dcefd2"/>
  <path d="M164 458c42-74 88-111 139-111 38 0 69 21 94 63 15-22 34-33 58-33 35 0 70 27 105 81H164Z" fill="#b8d7a8"/>
  <rect x="96" y="96" width="448" height="448" rx="42" fill="none" stroke="#c8dfbd" stroke-width="18"/>
  <text x="320" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#5f7660">No image</text>
</svg>`;

uploadDirs.forEach((dir) => {
    app.use('/uploads', express.static(dir));
});

app.get(/^\/uploads\/.+/, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('image/svg+xml').send(missingUploadPlaceholder.trim());
});

route(app);
connectDB()
    .then(() => backfillDeliveryStatuses())
    .catch((err) => console.error('Startup backfill error:', err.message));
startReminderMailJob();

if (!process.env.VNPAY_TMN_CODE || !process.env.VNPAY_HASH_SECRET) {
    console.warn('⚠️ VNPay sandbox keys missing – online VNPay checkout will fail until configured');
}

// ===== CHAT =====
// Multer setup for file uploads
const upload = multer({
    dest: path.join(__dirname, 'uploads/chatbot'),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});
// app.post('/chat', upload.single('image'), async (req, res) => {
//     try {
//         const { message, sessionId } = req.body;

//         const userId = req.user?.id || null;

//         const answer = await askQuestion(message, userId, sessionId, req.file);

//         return res.status(200).json({
//             success: true,
//             answer,
//         });
//     } catch (error) {
//         console.error('Chat error:', error);

//         return res.status(500).json({
//             success: false,
//             message: 'Internal server error',
//         });
//     }
// });

// SOCKET EVENT LISTENER
io.on('connection', (socket) => {
    socket.on('join', (room) => {
        if (typeof room !== 'string' || !room.trim()) return;
        const name = room.trim();
        if (!canJoinSocketRoom(socket.user, name)) {
            socket.emit('socket:error', { message: 'Không có quyền join room này' });
            return;
        }
        socket.join(name);
    });

    socket.on('leave', (room) => {
        if (typeof room === 'string' && room.trim()) {
            socket.leave(room.trim());
        }
    });
});

// START SERVER
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
