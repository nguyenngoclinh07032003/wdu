import DOMPurify from 'dompurify';

export function sanitizeHtml(html) {
    if (!html) return '';
    return DOMPurify.sanitize(String(html), {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target'],
    });
}

export default sanitizeHtml;
