const sanitizeHtml = require('sanitize-html');

const PRODUCT_HTML_OPTIONS = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2']),
    allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title', 'width', 'height'],
        a: ['href', 'name', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
};

function sanitizeProductHtml(html) {
    return sanitizeHtml(String(html || ''), PRODUCT_HTML_OPTIONS);
}

module.exports = {
    sanitizeProductHtml,
};
