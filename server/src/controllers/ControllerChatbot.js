const { askQuestion } = require('../utils/chatbot');

class ControllerChatbot {
    async chat(req, res) {
        try {
            const { message, sessionId } = req.body;

            const userId = req.user?.id || null;

            const answer = await askQuestion(message, userId, sessionId, req.file, req.user?.email || '');
            return res.status(200).json({
                success: true,
                answer,
            });
        } catch (error) {
            console.error('ControllerChatbot chat error:', error);

            return res.status(500).json({
                success: false,
                message: 'Lỗi khi xử lý chatbot',
            });
        }
    }
}

module.exports = new ControllerChatbot();
