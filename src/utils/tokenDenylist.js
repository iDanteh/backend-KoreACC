// Módulo para gestionar un denylist de tokens JWT revocados
const denylist = new Map();

/** Revoca un token hasta su expiración */
export function revokeToken(token, expSeconds) {
    const expMs = expSeconds * 1000;
    denylist.set(token, expMs);
}

/** Indica si el token está revocado (y limpia expirados) */
export function isTokenRevoked(token) {
    const expMs = denylist.get(token);
    if (!expMs) return false;
    const now = Date.now();
    if (now >= expMs) {
        denylist.delete(token);
        return false;
    }
    return true;
}

// limpieza periódica opcional
setInterval(() => {
    const now = Date.now();
    for (const [tok, exp] of denylist.entries()) {
        if (now >= exp) denylist.delete(tok);
    }
}, 60_000).unref();