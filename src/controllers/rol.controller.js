import { validationResult } from 'express-validator';
import { listRolesService, getRolByIdService, createRolService, updateRolService, softDeleteRolService, replacePermisosOnRolService } from '../services/rol.service.js';

export async function listRoles(req, res, next) {
    try {
        const { q, activo, page = 1, limit = 10 } = req.query;
        const parsedActivo = typeof activo === 'undefined' ? undefined : activo === 'true';
        const result = await listRolesService({ q, activo: parsedActivo, page, limit });
        res.json(result);
    } catch (e) { next(e); }
}

export async function getRolById(req, res, next) {
    try {
        const rol = await getRolByIdService(req.params.id);
        if (!rol) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json(rol);
    } catch (e) { next(e); }
}

export async function createRol(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const created = await createRolService(req.body);
        res.status(201).json({ message: 'Rol creado', rol: created });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
        }
        next(e);
    }
}

export async function updateRol(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const updated = await updateRolService(req.params.id, req.body);
        if (!updated) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json({ message: 'Rol actualizado', rol: updated });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Ya existe un rol con ese nombre' });
        }
        next(e);
    }
}

export async function deleteRol(req, res, next) {
    try {
        const deleted = await softDeleteRolService(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json({ message: 'Rol desactivado', rol: deleted });
    } catch (e) { next(e); }
}

export async function replacePermisosOnRol(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const updated = await replacePermisosOnRolService(req.params.id, req.body.permisos ?? []);
        if (!updated) return res.status(404).json({ message: 'Rol no encontrado' });
        res.json({ message: 'Permisos del rol actualizados', rol: updated });
    } catch (e) { next(e); }
}