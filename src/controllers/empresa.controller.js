import { validationResult } from 'express-validator';
import { createEmpresa, getEmpresa, listEmpresas, updateEmpresa, deleteEmpresa } from '../services/empresa.service.js';

export async function createEmpresaCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const data = await createEmpresa(req.body);
        res.status(201).json(data);
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'RFC duplicado' });
        next(e);
    }
}

export async function listEmpresasCtrl(_req, res, next) {
    try { res.json(await listEmpresas()); } catch (e) { next(e); }
}

export async function getEmpresaCtrl(req, res, next) {
    try {
        const item = await getEmpresa(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) { next(e); }
}

export async function updateEmpresaCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const item = await updateEmpresa(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) { next(e); }
}

export async function deleteEmpresaCtrl(req, res, next) {
    try {
        const ok = await deleteEmpresa(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Empresa eliminada' });
    } catch (e) { next(e); }
}
