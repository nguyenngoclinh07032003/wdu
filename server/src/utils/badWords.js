// Bad words utility placeholder
const badWords = [
    'địt',
    'đụ',
    'lồn',
    'cặc',
    'đm',
    'dm',
    'dmm',
    'vcl',
    'vl',
    'fuck',
    'shit',
    'sex',
    'jav',
    'casino',
    'cá độ',
    'telegram',
    'zalo.me',
    'http://',
    'https://',
    '.com',
    '.net',
];

const normalizeText = (text = '') => {
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const containsBadWords = (text = '') => {
    const normalized = normalizeText(text);

    return badWords.some((word) => {
        const cleanWord = normalizeText(word);
        return normalized.includes(cleanWord);
    });
};

module.exports = {
    badWords,
    containsBadWords,
};
