import classNames from 'classnames/bind';
import styles from '../Styles/DetailBlog.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Chatbot from '../utils/Chatbot/Chatbot';

import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
const IMAGE_URL = process.env.REACT_APP_IMG || 'http://localhost:5001/uploads';

const normalizePath = (path) => {
    if (!path) return '';
    return String(path).trim();
};

const getImageUrl = (path) => {
    const value = normalizePath(path);

    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('blob:')) return value;

    if (value.startsWith('/uploads/')) return `${SERVER_URL}${value}`;
    if (value.startsWith('uploads/')) return `${SERVER_URL}/${value}`;

    return `${IMAGE_URL}/${value.replace(/^\/+/, '')}`;
};

const handleImageError = (e, fallback) => {
    if (e.currentTarget.dataset.errorHandled === 'true') return;
    e.currentTarget.dataset.errorHandled = 'true';
    e.currentTarget.src = fallback;
};

const hasHtmlTag = (value) => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

const stripHtml = (html) => {
    return String(html || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
};

const formatPlainContent = (content) => {
    if (!content) return [];

    return String(content)
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/(?:^|\s)-\s+/g, '\n- ')
        .replace(/\s*(Trong Đông y:)/gi, '\n\n$1')
        .replace(/\s*(Gan khỏe\s*→)/gi, '\n\n$1')
        .replace(/\s*(Gan yếu\s*→)/gi, '\n$1')
        .replace(/\s*(\d+\.\s+)/g, '\n\n$1')
        .replace(/([.!?])\s+(Có người|Tuổi sinh|Nó nằm|Trong Đông y|Gan khỏe|Gan yếu)/g, '$1\n\n$2')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
};

function DetailBlog() {
    const { slug } = useParams();

    const [post, setPost] = useState(null);
    const [relatedPosts, setRelatedPosts] = useState([]);

    const [currentUser, setCurrentUser] = useState(null);

    const [comments, setComments] = useState([]);
    const [comment, setComment] = useState('');
    const [sendingComment, setSendingComment] = useState(false);

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editContent, setEditContent] = useState('');

    const [replyingCommentId, setReplyingCommentId] = useState(null);
    const [replyContent, setReplyContent] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    useEffect(() => {
        if (slug) {
            fetchPostDetail();
            fetchComments();
        }
    }, [slug]);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await request.get('/api/auth');
            setCurrentUser(res?.data?.user || res?.data || null);
        } catch (error) {
            setCurrentUser(null);
        }
    };

    const getCommentReplies = (commentId) => {
        return comments.filter((reply) => String(reply.parentCommentId) === String(commentId));
    };

    const isOwnerComment = (item) => {
        const commentUserId = item?.userId?._id || item?.userId;
        const currentUserId = currentUser?._id || currentUser?.id;

        if (!commentUserId || !currentUserId) return false;

        return String(commentUserId) === String(currentUserId);
    };

    const canEditComment = (item) => {
        return isOwnerComment(item);
    };

    const canDeleteComment = (item) => {
        const isAdmin = currentUser?.isAdmin === true || currentUser?.admin === true;
        return isOwnerComment(item) || isAdmin;
    };

    const fetchPostDetail = async () => {
        try {
            setLoading(true);
            setNotFound(false);

            const res = await request.get(`/api/blogs/${slug}`);
            const data = res?.data?.blog || res?.data || null;

            if (!data) {
                setPost(null);
                setRelatedPosts([]);
                setNotFound(true);
                return;
            }

            setPost(data);

            if (data?.category) {
                const relatedRes = await request.get(
                    `/api/blogs?category=${encodeURIComponent(data.category)}&limit=6`,
                );

                const relatedData = Array.isArray(relatedRes?.data?.blogs)
                    ? relatedRes.data.blogs
                    : Array.isArray(relatedRes?.data)
                      ? relatedRes.data
                      : [];

                setRelatedPosts(relatedData.filter((item) => item.slug !== data.slug).slice(0, 3));
            } else {
                setRelatedPosts([]);
            }
        } catch (error) {
            console.log('Lỗi lấy chi tiết bài viết:', error?.response?.data || error);
            setPost(null);
            setRelatedPosts([]);
            setNotFound(true);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await request.get(`/api/blogs/${slug}/comments`);

            const data = Array.isArray(res?.data?.comments)
                ? res.data.comments
                : Array.isArray(res?.data)
                  ? res.data
                  : [];

            setComments(data);
        } catch (error) {
            console.log('Lỗi lấy bình luận:', error?.response?.data || error);
            setComments([]);
        }
    };

    const handleSubmitComment = async () => {
        const value = comment.trim();

        if (!value) {
            toast.warning('Vui lòng nhập nội dung bình luận.');
            return;
        }

        if (value.length > 500) {
            toast.warning('Bình luận không được vượt quá 500 ký tự.');
            return;
        }

        try {
            setSendingComment(true);

            const res = await request.post(`/api/blogs/${slug}/comments`, {
                content: value,
            });

            const newComment = res?.data?.comment;

            if (newComment) {
                setComments((prev) => [newComment, ...prev]);
            } else {
                fetchComments();
            }

            setComment('');
            toast.success('Đăng bình luận thành công.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể gửi bình luận. Vui lòng đăng nhập.');
        } finally {
            setSendingComment(false);
        }
    };

    const handleReplyComment = async (parentCommentId) => {
        const value = replyContent.trim();

        if (!value) {
            toast.warning('Vui lòng nhập nội dung phản hồi.');
            return;
        }

        if (value.length > 500) {
            toast.warning('Phản hồi không được vượt quá 500 ký tự.');
            return;
        }

        try {
            setSendingReply(true);

            const res = await request.post(`/api/blogs/${slug}/comments`, {
                content: value,
                parentCommentId,
            });

            const newReply = res?.data?.comment;

            if (newReply) {
                setComments((prev) => [newReply, ...prev]);
            } else {
                fetchComments();
            }

            setReplyContent('');
            setReplyingCommentId(null);
            toast.success('Đã trả lời bình luận.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể trả lời bình luận.');
        } finally {
            setSendingReply(false);
        }
    };

    const handleDeleteComment = async (id) => {
        const confirmDelete = window.confirm('Bạn có chắc muốn xóa bình luận này không?');
        if (!confirmDelete) return;

        try {
            await request.delete(`/api/blog-comments/${id}`);
            setComments((prev) =>
                prev.filter((item) => item._id !== id && String(item.parentCommentId) !== String(id)),
            );
            toast.success('Đã xóa bình luận.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể xóa bình luận.');
        }
    };

    const handleUpdateComment = async (id) => {
        const value = editContent.trim();

        if (!value) {
            toast.warning('Nội dung bình luận không được để trống.');
            return;
        }

        if (value.length > 500) {
            toast.warning('Bình luận không được vượt quá 500 ký tự.');
            return;
        }

        try {
            const res = await request.patch(`/api/blog-comments/${id}`, {
                content: value,
            });

            const updatedComment = res?.data?.comment;

            setComments((prev) =>
                prev.map((item) =>
                    item._id === id
                        ? {
                              ...item,
                              content: updatedComment?.content || value,
                              editedAt: updatedComment?.editedAt || new Date().toISOString(),
                          }
                        : item,
                ),
            );

            setEditingCommentId(null);
            setEditContent('');
            toast.success('Sửa bình luận thành công.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể sửa bình luận.');
        }
    };

    const updateReactionState = (id, data) => {
        setComments((prev) =>
            prev.map((item) =>
                item._id === id
                    ? {
                          ...item,
                          likes: Array(data?.likes || 0).fill('x'),
                          dislikes: Array(data?.dislikes || 0).fill('x'),
                          hearts: Array(data?.hearts || 0).fill('x'),
                      }
                    : item,
            ),
        );
    };

    const handleLikeComment = async (id) => {
        try {
            const res = await request.patch(`/api/blog-comments/${id}/like`);
            updateReactionState(id, res?.data);
            toast.success('Đã thích bình luận.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Vui lòng đăng nhập để thả like.');
        }
    };

    const handleDislikeComment = async (id) => {
        try {
            const res = await request.patch(`/api/blog-comments/${id}/dislike`);
            updateReactionState(id, res?.data);
            toast.success('Đã dislike bình luận.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Vui lòng đăng nhập để dislike.');
        }
    };

    const handleHeartComment = async (id) => {
        try {
            const res = await request.patch(`/api/blog-comments/${id}/heart`);
            updateReactionState(id, res?.data);
            toast.success('Đã thả tym bình luận.');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Vui lòng đăng nhập để thả tym.');
        }
    };

    const coverImage = useMemo(() => {
        if (post?.thumbnail && !post.thumbnail.startsWith('blob:')) {
            return getImageUrl(post.thumbnail);
        }

        return 'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?q=80&w=1200&auto=format&fit=crop';
    }, [post]);

    const postTags = useMemo(() => {
        if (Array.isArray(post?.tags)) return post.tags.filter(Boolean);

        if (typeof post?.tags === 'string') {
            return post.tags
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
        }

        return [];
    }, [post]);

    const contentLines = useMemo(() => {
        const rawContent = hasHtmlTag(post?.content) ? stripHtml(post?.content) : post?.content;
        return formatPlainContent(rawContent);
    }, [post]);

    const renderCommentBody = (item, isReply = false) => {
        const user = item.userId || {};
        const name = user.fullname || user.email || 'Người dùng';

        return (
            <>
                <div className={isReply ? cx('replyHeader') : cx('commentHeader')}>
                    <div>
                        <strong>{name}</strong>
                        <span>
                            {new Date(item.createdAt).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                            })}
                            {item.editedAt ? ' • Đã sửa' : ''}
                        </span>
                    </div>

                    {(canEditComment(item) || canDeleteComment(item)) && (
                        <div className={cx('commentMoreActions')}>
                            {canEditComment(item) && (
                                <button
                                    type="button"
                                    className={cx('editCommentBtn')}
                                    onClick={() => {
                                        setEditingCommentId(item._id);
                                        setEditContent(item.content);
                                    }}
                                >
                                    Sửa
                                </button>
                            )}

                            {canDeleteComment(item) && (
                                <button
                                    type="button"
                                    className={cx('deleteCommentBtn')}
                                    onClick={() => handleDeleteComment(item._id)}
                                >
                                    Xóa
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {editingCommentId === item._id ? (
                    <div className={cx('editCommentBox')}>
                        <textarea
                            value={editContent}
                            maxLength={500}
                            onChange={(e) => setEditContent(e.target.value)}
                        />

                        <div className={cx('editActions')}>
                            <span>{editContent.length}/500</span>

                            <div>
                                <button type="button" onClick={() => handleUpdateComment(item._id)}>
                                    Lưu
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setEditContent('');
                                    }}
                                >
                                    Hủy
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p>{item.content}</p>
                )}

                <div className={cx('commentFooter')}>
                    <button type="button" className={cx('reactionBtn')} onClick={() => handleLikeComment(item._id)}>
                        👍 {item.likes?.length || 0}
                    </button>

                    <button type="button" className={cx('reactionBtn')} onClick={() => handleDislikeComment(item._id)}>
                        👎 {item.dislikes?.length || 0}
                    </button>

                    <button type="button" className={cx('reactionBtn')} onClick={() => handleHeartComment(item._id)}>
                        ❤️ {item.hearts?.length || 0}
                    </button>

                    {!isReply && (
                        <button
                            type="button"
                            className={cx('reactionBtn')}
                            onClick={() => {
                                setReplyingCommentId(item._id);
                                setReplyContent('');
                            }}
                        >
                            Trả lời
                        </button>
                    )}
                </div>
            </>
        );
    };

    if (loading) {
        return (
            <>
                <Header />
                <ToastContainer position="top-right" autoClose={2500} newestOnTop pauseOnHover theme="light" />
                <main className={cx('wrapper')}>
                    <div className={cx('container')}>
                        <div className={cx('loading')}>Đang tải bài viết...</div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (notFound || !post) {
        return (
            <>
                <Header />
                <ToastContainer position="top-right" autoClose={2500} newestOnTop pauseOnHover theme="light" />
                <main className={cx('wrapper')}>
                    <div className={cx('container')}>
                        <div className={cx('loading')}>Không tìm thấy bài viết.</div>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />

            <ToastContainer position="top-right" autoClose={2500} newestOnTop pauseOnHover theme="light" />

            <main className={cx('wrapper')}>
                <div className={cx('container')}>
                    <div className={cx('topTicker')}>
                        <span className={cx('tickerLabel')}>TIN TỨC HOT</span>
                        <span className={cx('tickerText')}>Đang đọc: {post.title}</span>
                    </div>

                    <div className={cx('breadcrumb')}>
                        <Link to="/">Trang chủ</Link>
                        <span>›</span>
                        <Link to="/blog">Blog</Link>
                        <span>›</span>
                        <span>Chi tiết bài viết</span>
                    </div>

                    <div className={cx('categoryWrap')}>
                        <span className={cx('categoryBadge')}>{post.category || 'KIẾN THỨC'}</span>
                    </div>

                    <h1 className={cx('title')}>{post.title}</h1>

                    <div className={cx('metaRow')}>
                        <div className={cx('authorInfo')}>
                            <div className={cx('authorAvatar')}>{post.author?.charAt(0) || 'A'}</div>

                            <div className={cx('authorText')}>
                                <strong>{post.author || 'Admin'}</strong>
                                <span>
                                    {new Date(post.createdAt || Date.now()).toLocaleDateString('vi-VN')} •{' '}
                                    {post.readTime || '4 phút đọc'}
                                </span>
                            </div>
                        </div>

                        <div className={cx('shareButtons')}>
                            <button type="button">Facebook</button>
                            <button type="button">Zalo</button>
                        </div>
                    </div>

                    <div className={cx('cover')}>
                        <img
                            src={coverImage}
                            alt={post.title}
                            onError={(e) =>
                                handleImageError(
                                    e,
                                    'https://images.unsplash.com/photo-1516589091380-5d8e87df6999?q=80&w=1200&auto=format&fit=crop',
                                )
                            }
                        />

                        <p className={cx('coverCaption')}>
                            {post.metaDescription || 'Hình ảnh minh họa cho nội dung bài viết.'}
                        </p>
                    </div>

                    <article className={cx('content')}>
                        {contentLines.length > 0 ? (
                            <div>
                                {contentLines.map((line, index) => {
                                    const isFirstLine = index === 0;
                                    const isSubTitle = line.startsWith('(') && line.endsWith(')');
                                    const isBullet = line.startsWith('-');

                                    if (isFirstLine) {
                                        return (
                                            <h2 key={index} className={cx('contentTitle')}>
                                                {line}
                                            </h2>
                                        );
                                    }

                                    if (isSubTitle) {
                                        return (
                                            <p key={index} className={cx('contentSubTitle')}>
                                                {line}
                                            </p>
                                        );
                                    }

                                    if (isBullet) {
                                        return (
                                            <p key={index} className={cx('contentBullet')}>
                                                {line}
                                            </p>
                                        );
                                    }

                                    return <p key={index}>{line}</p>;
                                })}
                            </div>
                        ) : (
                            <p>Chưa có nội dung bài viết.</p>
                        )}
                    </article>

                    {postTags.length > 0 && (
                        <div className={cx('tags')}>
                            {postTags.map((tag, index) => (
                                <span key={`${tag}-${index}`}>#{tag.replace(/\s+/g, '')}</span>
                            ))}
                        </div>
                    )}

                    <div className={cx('authorCard')}>
                        <div className={cx('authorCardAvatar')}>{post.author?.charAt(0) || 'A'}</div>

                        <div className={cx('authorCardInfo')}>
                            <h3>{post.author || 'Admin'}</h3>
                            <p>
                                Bài viết được biên soạn nhằm chia sẻ kiến thức hữu ích, dễ hiểu và thực tế cho người
                                đọc.
                            </p>
                        </div>
                    </div>

                    <section className={cx('commentSection')}>
                        <h2>
                            Bình luận <span>{comments.length}</span>
                        </h2>

                        <div className={cx('commentBox')}>
                            <div className={cx('commentAvatar')}>•</div>

                            <div className={cx('commentInputWrap')}>
                                <textarea
                                    placeholder="Chia sẻ ý kiến của bạn..."
                                    value={comment}
                                    maxLength={500}
                                    onChange={(e) => setComment(e.target.value)}
                                />

                                <div className={cx('commentActions')}>
                                    <span>{comment.length}/500</span>

                                    <button type="button" onClick={handleSubmitComment} disabled={sendingComment}>
                                        {sendingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={cx('commentList')}>
                            {comments.filter((item) => !item.parentCommentId).length > 0 ? (
                                comments
                                    .filter((item) => !item.parentCommentId)
                                    .map((item) => {
                                        const user = item.userId || {};
                                        const name = user.fullname || user.email || 'Người dùng';
                                        const avatar = user.avatar ? getImageUrl(user.avatar) : '';
                                        const replies = getCommentReplies(item._id);

                                        return (
                                            <div key={item._id} className={cx('commentItem')}>
                                                <div className={cx('commentUserAvatar')}>
                                                    {avatar ? (
                                                        <img
                                                            src={avatar}
                                                            alt={name}
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>{name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>

                                                <div className={cx('commentContent')}>
                                                    {renderCommentBody(item)}

                                                    {replyingCommentId === item._id && (
                                                        <div className={cx('replyBox')}>
                                                            <textarea
                                                                placeholder="Nhập phản hồi..."
                                                                value={replyContent}
                                                                maxLength={500}
                                                                onChange={(e) => setReplyContent(e.target.value)}
                                                            />

                                                            <div className={cx('replyActions')}>
                                                                <span>{replyContent.length}/500</span>

                                                                <div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleReplyComment(item._id)}
                                                                        disabled={sendingReply}
                                                                    >
                                                                        {sendingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setReplyingCommentId(null);
                                                                            setReplyContent('');
                                                                        }}
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {replies.length > 0 && (
                                                        <div className={cx('replyList')}>
                                                            {replies.map((reply) => {
                                                                const replyUser = reply.userId || {};
                                                                const replyName =
                                                                    replyUser.fullname ||
                                                                    replyUser.email ||
                                                                    'Người dùng';
                                                                const replyAvatar = replyUser.avatar
                                                                    ? getImageUrl(replyUser.avatar)
                                                                    : '';

                                                                return (
                                                                    <div key={reply._id} className={cx('replyItem')}>
                                                                        <div className={cx('replyAvatar')}>
                                                                            {replyAvatar ? (
                                                                                <img
                                                                                    src={replyAvatar}
                                                                                    alt={replyName}
                                                                                    onError={(e) => {
                                                                                        e.currentTarget.style.display =
                                                                                            'none';
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <span>
                                                                                    {replyName.charAt(0).toUpperCase()}
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className={cx('replyContent')}>
                                                                            {renderCommentBody(reply, true)}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                            ) : (
                                <p className={cx('emptyComment')}>Chưa có bình luận nào.</p>
                            )}
                        </div>
                    </section>
                </div>

                <section className={cx('relatedSection')}>
                    <div className={cx('relatedInner')}>
                        <h2>Bài viết liên quan</h2>

                        <div className={cx('relatedGrid')}>
                            {relatedPosts.length > 0 ? (
                                relatedPosts.map((item) => (
                                    <Link
                                        to={`/blog/${item.slug}`}
                                        key={item._id || item.slug}
                                        className={cx('relatedCard')}
                                    >
                                        <img
                                            src={
                                                item.thumbnail && !item.thumbnail.startsWith('blob:')
                                                    ? getImageUrl(item.thumbnail)
                                                    : 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900&auto=format&fit=crop'
                                            }
                                            alt={item.title}
                                            onError={(e) =>
                                                handleImageError(
                                                    e,
                                                    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900&auto=format&fit=crop',
                                                )
                                            }
                                        />

                                        <div className={cx('relatedContent')}>
                                            <span>{item.category || 'KIẾN THỨC'}</span>
                                            <h3>{item.title}</h3>
                                            <p>{item.excerpt || 'Chưa có mô tả ngắn cho bài viết này.'}</p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className={cx('loading')}>Chưa có bài viết liên quan.</div>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
            <Chatbot />
        </>
    );
}

export default DetailBlog;
