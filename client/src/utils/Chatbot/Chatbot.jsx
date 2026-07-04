import React, { useState, useRef, useEffect, useMemo } from 'react';
import styles from './Chatbot.module.scss';
import { requestChat } from '../../Config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faImage, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import AImage from '../../assests/imgs/logoai2.png';
import DOMPurify from 'dompurify';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            text:
                '👋 Chào anh/chị! Em là XoaAI - trợ lý tư vấn 24/7 của Mộc Xoa. ' +
                '<br/>' +
                'Anh/chị cần tư vấn về sản phẩm nào hoặc có câu hỏi gì không ạ?' +
                '<br/>' +
                '👉 Dụng cụ massage' +
                '<br/>' +
                '👉 Dưỡng sinh ngải cứu' +
                '<br/>' +
                '👉 Tinh dầu và thảo dược' +
                '<br/>' +
                '👉 Chăm sóc tóc & da đầu' +
                '<br/>' +
                '👉 Combo tiết kiệm' +
                '<br/>' +
                'Em sẽ giúp anh/chị tìm được sản phẩm phù hợp nhất! 😊' +
                '<br/><br/>' +
                '💡 Mẹo: Anh/chị có thể gửi hình ảnh hoặc mô tả triệu chứng để em tư vấn chính xác hơn nhé!',

            sender: 'bot',
        },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewImage, setPreviewImage] = useState('');

    const [sessionId] = useState(() => {
        let id = localStorage.getItem('chat_session_id');

        if (!id) {
            id = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('chat_session_id', id);
        }

        return id;
    });

    const messagesEndRef = useRef(null);
    const chatbotRef = useRef(null);

    const greetingText = useMemo(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 11) return '🌤️ Chào buổi sáng! Em là XoaAI, rất vui được hỗ trợ anh/chị!';
        if (hour >= 11 && hour < 13) return '☀️ Chào buổi trưa! Anh/chị cần tư vấn về sản phẩm nào ạ?';
        if (hour >= 13 && hour < 18) return '🌿 Chào buổi chiều! Anh/chị cần hỗ trợ gì ạ?';
        if (hour >= 18 && hour < 22) return '🌙 Chào buổi tối! XoaAI luôn sẵn sàng hỗ trợ.';

        return '💫 Khuya rồi, Anh/chị cần XoaAI hỗ trợ gì không ạ?';
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && chatbotRef.current && !chatbotRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (previewImage) {
                URL.revokeObjectURL(previewImage);
            }
        };
    }, [previewImage]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('Ảnh không được vượt quá 5MB.');
            return;
        }

        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }

        setSelectedImage(file);
        setPreviewImage(URL.createObjectURL(file));

        e.target.value = '';
    };

    const handleRemovePreview = () => {
        if (previewImage) {
            URL.revokeObjectURL(previewImage);
        }

        setSelectedImage(null);
        setPreviewImage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if ((!inputMessage.trim() && !selectedImage) || isLoading) return;

        const userMessage = inputMessage.trim();
        const imagePreview = previewImage;

        setMessages((prev) => [
            ...prev,
            {
                text: userMessage || '📷 Đã gửi hình ảnh',
                image: imagePreview,
                sender: 'user',
            },
        ]);

        setInputMessage('');
        setSelectedImage(null);
        setPreviewImage('');
        setIsLoading(true);

        try {
            let response;

            if (selectedImage) {
                const formData = new FormData();
                formData.append('message', userMessage);
                formData.append('sessionId', sessionId);
                formData.append('image', selectedImage);
                response = await requestChat(formData);
            } else {
                response = await requestChat({
                    message: userMessage,
                    sessionId,
                });
            }

            const botText =
                response?.data?.answer || response?.answer || response || 'Tôi đã nhận được tin nhắn của bạn.';

            setMessages((prev) => [
                ...prev,
                {
                    text: botText,
                    sender: 'bot',
                },
            ]);
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    text: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.',
                    sender: 'bot',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {!isOpen && <div className={styles.greetingBubble}>{greetingText}</div>}

            <button className={styles.chatButton} onClick={() => setIsOpen(!isOpen)} aria-label="Chat">
                <img src={AImage} alt="Chat AI" className={styles.chatImage} />
            </button>

            {isOpen && (
                <div ref={chatbotRef} className={styles.chatbotContainer}>
                    <div className={styles.chatHeader}>
                        <div className={styles.headerInfo}>
                            <img className={styles.headerAvatar} src={AImage} alt="Avatar" />

                            <div>
                                <h2>Xoa AI</h2>
                                <span>Trợ lý tư vấn sản phẩm</span>
                            </div>
                        </div>

                        <button className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Đóng chat">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <div className={styles.messageList}>
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`${styles.messageRow} ${
                                    message.sender === 'user' ? styles.userRow : styles.botRow
                                }`}
                            >
                                {message.sender === 'bot' && (
                                    <img src={AImage} alt="Bot" className={styles.messageAvatar} />
                                )}

                                <div
                                    className={`${styles.messageBubble} ${
                                        message.sender === 'user' ? styles.userMessage : styles.botMessage
                                    }`}
                                >
                                    {message.image && (
                                        <img src={message.image} alt="Uploaded" className={styles.chatImagePreview} />
                                    )}

                                    {message.text && (
                                        <div
                                            className={styles.messageContent}
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(message.text),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className={`${styles.messageRow} ${styles.botRow}`}>
                                <img src={AImage} alt="Bot" className={styles.messageAvatar} />

                                <div className={`${styles.messageBubble} ${styles.botMessage}`}>
                                    <div className={styles.typingDots}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {previewImage && (
                        <div className={styles.previewBox}>
                            <img src={previewImage} alt="Preview" className={styles.previewImage} />

                            <button type="button" className={styles.removePreview} onClick={handleRemovePreview}>
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.inputForm}>
                        <label className={styles.uploadButton} title="Tải ảnh lên">
                            <FontAwesomeIcon icon={faImage} />
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={handleImageChange}
                                disabled={isLoading}
                            />
                        </label>

                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Nhập tin nhắn của bạn..."
                            className={styles.input}
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            className={styles.sendButton}
                            disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                        >
                            <FontAwesomeIcon icon={faPaperPlane} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
