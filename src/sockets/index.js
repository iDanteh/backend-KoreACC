import { Server } from "socket.io";
import { env } from '../config/env.js';
import { verifyJwtToken } from '../middlewares/auth.js';
import { isTokenRevoked } from "../utils/tokenDenylist.js";

const userSockets = new Map();

const roleSockets = new Map();

let io = null;

export function initSockets(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: env.security.corsOrigin,
        },
    });

    io.on('connection', async (socket) => {
        try {
            const authToken = socket.handshake.auth?.token;
            const headerAuth = socket.handshake.headers?.authorization || '';
            const headerToken = headerAuth.startsWith('Bearer ')
                ? headerAuth.slice(7)
                : null;
            const queryToken = socket.handshake.query?.token;

            const token = authToken || headerToken || queryToken;
            if (!token) {
                console.warn('Socket sin token, desconectando');
                socket.disconnect(true);
                return;
            }

            const payload = verifyJwtToken(token);

            const revoked = await isTokenRevoked(token);
            if (revoked) {
                console.warn('Socket con token revocado, desconectando');
                socket.disconnect(true);
                return;
            }

            const rawUserId = payload.sub;

            if (!rawUserId) {
                console.warn('JWT sin userId claro, desconectando');
                socket.disconnect(true);
                return;
            }

            const userId = Number(rawUserId);

            if (Number.isNaN(userId)) {
                console.warn('sub del JWT no es numérico, desconectado');
                socket.disconnect(true);
                return;
            }

            socket.data.userId = userId;

            const rolesFromToken = Array.isArray(payload.roles) ? payload.roles: [];
            socket.data.roles = rolesFromToken.map(r => String(r));

            let socketsSet = userSockets.get(socket.data.userId);
            if (!socketsSet) {
                socketsSet = new Set();
                userSockets.set(socket.data.userId, socketsSet);
            }
            socketsSet.add(socket);

            for (const roleName of socket.data.roles) {
                let set = roleSockets.get(roleName);
                if (!set) {
                set = new Set();
                roleSockets.set(roleName, set);
                }
                set.add(socket);
            }

            console.log(`Socket conectado para usuario ${userId} con roles [${socket.data.roles.join(', ')}]`);

            socket.on('disconnect', () => {
                const userSet = userSockets.get(userId);
                if (userSet) {
                userSet.delete(socket);
                if (userSet.size === 0) {
                    userSockets.delete(userId);
                }
                }

                if (Array.isArray(socket.data.roles)) {
                for (const roleName of socket.data.roles) {
                    const set = roleSockets.get(roleName);
                    if (set) {
                    set.delete(socket);
                    if (set.size === 0) {
                        roleSockets.delete(roleName);
                    }
                    }
                }
                }

                console.log(`Socket desconectado para usuario ${userId}`);
            });
        } catch (error) {
            console.error('Error autenticando sokcet: ', error?.message || error);
            socket.disconnect(true);
        }
    });

    console.log('Sockets inicializados');
}

export function notifyUserRolesChanged(userId, roles) {
    if (!io) {
        console.warn('notifyUserRolesChanged llamado antes de initSockets');
        return;
    }

    const intId = Number(userId);
    const socketsSet = userSockets.get(intId);
    if (!socketsSet || socketsSet.size === 0) {
        return;
    }

    const payload = {
        userId: intId,
        roles,
        updatedAt: new Date().toISOString(),
    };

    for (const s of socketsSet) {
        s.emit('permissions:changed', payload);
    }
}

export function notifyRolePermissionsChanged(roleName, permisos) {
    if (!io) {
        console.warn('notifyRolePermissionsChanged llamado antes de initSockets');
        return;
    }

    const key = String(roleName);
    const socketsSet = roleSockets.get(key);
    if (!socketsSet || socketsSet.size === 0) {
        return;
    }

    const payload = {
        role: key,
        permisos,
        updatedAt: new Date().toISOString(),
    };

    for (const s of socketsSet) {
        s.emit('role-permissions:changed', payload);
    }
}