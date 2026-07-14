require('./Config/loadEnv');
const express = require('express');
const app = express();
const route = require('./routes');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./Config/db');
const path = require('path');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const { askQuestion } = require('./utils/chatbot');
const startReminderMailJob = require('./jobs/reminderMailJob');
const multer = require('multer');

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

// ===== SOCKET.IO =====
const io = new Server(server, {
    cors: {
        origin: process.env.REACT_APP_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

app.set('io', io);

// ===== MIDDLEWARE =====
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.REACT_APP_URL,
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

// upload cache
app.use(
    '/uploads',
    (req, res, next) => {
        res.set('Cache-Control', 'public, max-age=31536000');
        next();
    },
    express.static(path.join(__dirname, 'uploads')),
);

app.use('/uploads', express.static('uploads'));

const missingUploadPlaceholder = `
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" role="img" aria-label="No image">
  <rect width="640" height="640" rx="56" fill="#f4f9ef"/>
  <circle cx="320" cy="246" r="78" fill="#dcefd2"/>
  <path d="M164 458c42-74 88-111 139-111 38 0 69 21 94 63 15-22 34-33 58-33 35 0 70 27 105 81H164Z" fill="#b8d7a8"/>
  <rect x="96" y="96" width="448" height="448" rx="42" fill="none" stroke="#c8dfbd" stroke-width="18"/>
  <text x="320" y="548" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#5f7660">No image</text>
</svg>`;

app.get(/^\/uploads\/.+/, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.type('image/svg+xml').send(missingUploadPlaceholder.trim());
});

route(app);
connectDB();
startReminderMailJob();

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

// // SOCKET EVENT LISTENER
// io.on('connection', (socket) => {
//     console.log('User connected:', socket.id);

//     socket.on('disconnect', () => {
//         console.log('User disconnected:', socket.id);
//     });
// });

// START SERVER
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
