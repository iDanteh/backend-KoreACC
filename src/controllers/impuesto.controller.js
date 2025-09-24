import { validationResult } from 'express-validator';
import { createImpuesto, getImpuesto, listImpuestos, updateImpuesto, deleteImpuesto } from '../services/impuesto.service.js';

export async function createImpuestoCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const item = await createImpuesto(req.body);
        res.status(201).json(item);
    } catch (e) {
        if (e?.original?.constraint === 'impuesto_sin_solape') return res.status(409).json({ message: 'Vigencia solapada para este impuesto' });
        if (e?.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'Conflicto de unicidad' });
        next(e);
    }
}

export async function listImpuestosCtrl(req, res, next) {
    try { res.json(await listImpuestos(req.query)); } catch (e) { next(e); }
}

export async function getImpuestoCtrl(req, res, next) {
    try {
        const item = await getImpuesto(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) { next(e); }
}

export async function updateImpuestoCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const item = await updateImpuesto(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        if (e?.original?.constraint === 'impuesto_sin_solape') return res.status(409).json({ message: 'Vigencia solapada para este impuesto' });
        next(e);
    }
}

export async function deleteImpuestoCtrl(req, res, next) {
    try {
        const ok = await deleteImpuesto(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Impuesto eliminado' });
    } catch (e) { next(e); }
}