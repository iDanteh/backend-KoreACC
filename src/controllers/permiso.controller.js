import { validationResult } from 'express-validator';
import { listPermisosService, getPermisoByIdService, createPermisoService, updatePermisoService, deletePermisoService } from '../services/permiso.service.js';

export async function listPermisos(req, res, next) {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        const result = await listPermisosService({ q, page, limit });
        res.json(result);
    } catch (e) { next(e); }
}

export async function getPermisoById(req, res, next) {
    try {
        const p = await getPermisoByIdService(req.params.id);
        if (!p) return res.status(404).json({ message: 'Permiso no encontrado' });
        res.json(p);
    } catch (e) { next(e); }
}

export async function createPermiso(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const created = await createPermisoService(req.body);
        res.status(201).json({ message: 'Permiso creado', permiso: created });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Ya existe un permiso con ese nombre' });
        }
        next(e);
    }
}

export async function updatePermiso(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const updated = await updatePermisoService(req.params.id, req.body);
        if (!updated) return res.status(404).json({ message: 'Permiso no encontrado' });
        res.json({ message: 'Permiso actualizado', permiso: updated });
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ message: 'Ya existe un permiso con ese nombre' });
        }
        next(e);
    }
}

export async function deletePermiso(req, res, next) {
    try {
        const ok = await deletePermisoService(req.params.id);
        if (!ok) return res.status(404).json({ message: 'Permiso no encontrado' });
        res.json({ message: 'Permiso eliminado' });
    } catch (e) { next(e); }
}