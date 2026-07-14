import React, { useState, useRef, useEffect, useMemo } from 'react';
import styles from './Chatbot.module.scss';
import { requestChat } from '../../Config/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faImage, faPaperPlane, faUserDoctor, faHeadset } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useStore } from '../../hooks/useStore';
import { canUseCustomerAsk } from '../../utils/canUseCustomerAsk';
import AImage from '../../assests/imgs/logoai2.png';
import DOMPurify from 'dompurify';

const LAUNCHER_SIZE = 72;
const LAUNCHER_MARGIN = 12;

const clampLauncherPosition = (position) => {
    if (typeof window === 'undefined') return position;

    const maxX = Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_SIZE - LAUNCHER_MARGIN);
    const maxY = Math.max(LAUNCHER_MARGIN, window.innerHeight - LAUNCHER_SIZE - LAUNCHER_MARGIN);

    return {
        x: Math.min(maxX, Math.max(LAUNCHER_MARGIN, position.x)),
        y: Math.min(maxY, Math.max(LAUNCHER_MARGIN, position.y)),
    };
};

const getDefaultLauncherPosition = () => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };

    return {
        x: Math.max(LAUNCHER_MARGIN, window.innerWidth - LAUNCHER_SIZE - 24),
        y: Math.max(LAUNCHER_MARGIN, window.innerHeight - LAUNCHER_SIZE - 24),
    };
};

const getStoredLauncherPosition = () => {
    if (typeof window === 'undefined') return getDefaultLauncherPosition();

    try {
        const stored = JSON.parse(localStorage.getItem('chat_launcher_position') || 'null');

        if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
            return clampLauncherPosition(stored);
        }
    } catch (error) {
        localStorage.removeItem('chat_launcher_position');
    }

    return getDefaultLauncherPosition();
};

const Chatbot = () => {
    const navigate = useNavigate();
    const { dataUser } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [launcherPosition, setLauncherPosition] = useState(getStoredLauncherPosition);
    const [isDraggingLauncher, setIsDraggingLauncher] = useState(false);
    const [messages, setMessages] = useState([
        {
            text:
                '👋 Chào anh/chị! Em là Healthcare AI - trợ lý tư vấn 24/7 của Healthcare. ' +
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
                '👨‍⚕️ Cần hỏi người thật? Chọn <b>Chat với bác sĩ</b> hoặc <b>Chat với nhân viên</b> bên dưới nhé!' +
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
    const launcherRef = useRef(null);
    const launcherPositionRef = useRef(launcherPosition);
    const launcherDragRef = useRef(null);
    const launcherWasDraggedRef = useRef(false);
    const suppressNextLauncherClickRef = useRef(false);

    const greetingText = useMemo(() => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 11) return '🌤️ Chào buổi sáng! Em là HealthCareAI, rất vui được hỗ trợ anh/chị!';
        if (hour >= 11 && hour < 13) return '☀️ Chào buổi trưa! Anh/chị cần tư vấn về sản phẩm nào ạ?';
        if (hour >= 13 && hour < 18) return '🌿 Chào buổi chiều! Anh/chị cần hỗ trợ gì ạ?';
        if (hour >= 18 && hour < 22) return '🌙 Chào buổi tối! HealthCareAI luôn sẵn sàng hỗ trợ.';

        return '💫 Khuya rồi, Anh/chị cần HealthCareAI hỗ trợ gì không ạ?';
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        launcherPositionRef.current = launcherPosition;
    }, [launcherPosition]);

    useEffect(() => {
        const handleResize = () => {
            setLauncherPosition((prev) => {
                const next = clampLauncherPosition(prev);
                localStorage.setItem('chat_launcher_position', JSON.stringify(next));
                return next;
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                isOpen &&
                chatbotRef.current &&
                !chatbotRef.current.contains(event.target) &&
                !launcherRef.current?.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleOpenChatbot = () => setIsOpen(true);
        window.addEventListener('openChatbot', handleOpenChatbot);
        return () => window.removeEventListener('openChatbot', handleOpenChatbot);
    }, []);

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

    const handleHumanChat = (target) => {
        const path = target === 'doctor' ? '/hoi-bac-si' : '/hoi-nhan-vien';

        if (!dataUser?._id) {
            navigate('/login');
            setIsOpen(false);
            return;
        }

        if (dataUser?._id && !canUseCustomerAsk(dataUser)) {
            toast.info('Tính năng này dành cho khách hàng. Vui lòng đăng xuất hoặc dùng tài khoản khách.');
            return;
        }

        navigate(path);
        setIsOpen(false);
    };

    const handleLauncherPointerDown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;

        launcherDragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            initialX: launcherPositionRef.current.x,
            initialY: launcherPositionRef.current.y,
        };
        launcherWasDraggedRef.current = false;
        setIsDraggingLauncher(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
    };

    const handleLauncherPointerMove = (event) => {
        const drag = launcherDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            launcherWasDraggedRef.current = true;
        }

        setLauncherPosition(
            clampLauncherPosition({
                x: drag.initialX + deltaX,
                y: drag.initialY + deltaY,
            }),
        );
    };

    const handleLauncherPointerUp = (event) => {
        const drag = launcherDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;

        launcherDragRef.current = null;
        setIsDraggingLauncher(false);
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        localStorage.setItem('chat_launcher_position', JSON.stringify(launcherPositionRef.current));

        if (!launcherWasDraggedRef.current) {
            suppressNextLauncherClickRef.current = true;
            setIsOpen((prev) => !prev);
        }
    };

    const handleChatButtonClick = (event) => {
        if (suppressNextLauncherClickRef.current) {
            event.preventDefault();
            suppressNextLauncherClickRef.current = false;
            return;
        }

        if (launcherWasDraggedRef.current) {
            event.preventDefault();
            setTimeout(() => {
                launcherWasDraggedRef.current = false;
            }, 0);
            return;
        }

        setIsOpen((prev) => !prev);
    };

    const launcherClassName = [
        styles.chatLauncher,
        isDraggingLauncher ? styles.dragging : '',
        launcherPosition.x < 300 ? styles.alignBubbleLeft : '',
        launcherPosition.y < 120 ? styles.bubbleBelow : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            <div
                ref={launcherRef}
                className={launcherClassName}
                style={{ left: launcherPosition.x, top: launcherPosition.y }}
                onPointerDown={handleLauncherPointerDown}
                onPointerMove={handleLauncherPointerMove}
                onPointerUp={handleLauncherPointerUp}
                onPointerCancel={handleLauncherPointerUp}
            >
                {!isOpen && <div className={styles.greetingBubble}>{greetingText}</div>}

                <button className={styles.chatButton} onClick={handleChatButtonClick} aria-label="Chat">
                    <img src={AImage} alt="Chat AI" className={styles.chatImage} />
                </button>
            </div>

            {isOpen && (
                <div ref={chatbotRef} className={styles.chatbotContainer}>
                    <div className={styles.chatHeader}>
                        <div className={styles.headerInfo}>
                            <img className={styles.headerAvatar} src={AImage} alt="Avatar" />

                            <div>
                                <h2>HealthCareAI AI</h2>
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

                    <div className={styles.quickActions}>
                        <button
                            type="button"
                            className={`${styles.quickActionBtn} ${styles.doctorBtn}`}
                            onClick={() => handleHumanChat('doctor')}
                        >
                            <FontAwesomeIcon icon={faUserDoctor} />
                            <span>Chat với bác sĩ</span>
                        </button>
                        <button
                            type="button"
                            className={`${styles.quickActionBtn} ${styles.staffBtn}`}
                            onClick={() => handleHumanChat('staff')}
                        >
                            <FontAwesomeIcon icon={faHeadset} />
                            <span>Chat với nhân viên</span>
                        </button>
                    </div>

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
