import { Usuario, Rol } from '../models/index.js';

export async function findUserForLogin(identifier) {
  // Permite login por correo o por usuario
    const where = identifier.includes('@') ? { correo: identifier } : { usuario: identifier };
    return Usuario.findOne({
        where,
        include: { model: Rol, through: { attributes: [] } },
  });
}
