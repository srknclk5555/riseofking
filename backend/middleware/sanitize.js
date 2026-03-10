/**
 * XSS Sanitization Middleware
 *
 * Tüm gelen request body ve query değerlerindeki HTML tag'larını siler,
 * ancak tag içindeki metin içeriğini korur.
 *
 * Örnek davranışlar:
 *   "<b>Klan Adı</b>"            → "Klan Adı"
 *   "<img src=x onerror=...>"    → ""   (void element, içeriği yok)
 *   "<script>alert(1)</script>"  → ""   (içerik de silinir)
 *   "Normal metin"               → "Normal metin"  (dokunulmaz)
 */

const sanitizeHtml = require('sanitize-html');

// Hiçbir HTML tag'ine izin verme; tag'leri sil, metin içeriğini koru.
const sanitizeOptions = {
    allowedTags: [],              // Hiçbir tag'e izin yok
    allowedAttributes: {},        // Hiçbir attribute'e izin yok
    disallowedTagsMode: 'discard',// Tag'i sil; içindeki metni bırak
};

/**
 * Recursive sanitizer: string, array ve objeleri destekler.
 */
function sanitizeValue(value) {
    if (typeof value === 'string') {
        return sanitizeHtml(value, sanitizeOptions).trim();
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value !== null && typeof value === 'object') {
        const sanitized = {};
        for (const key of Object.keys(value)) {
            sanitized[key] = sanitizeValue(value[key]);
        }
        return sanitized;
    }
    // number, boolean, null → değiştirme
    return value;
}

/**
 * Express middleware: req.body ve req.query'yi sanitize eder.
 */
const sanitizeMiddleware = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeValue(req.query);
    }
    next();
};

module.exports = sanitizeMiddleware;
