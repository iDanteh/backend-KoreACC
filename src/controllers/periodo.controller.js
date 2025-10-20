import { validationResult } from 'express-validator';
import { createPeriodo, getPeriodo, listPeriodos, updatePeriodo, cerrarPeriodo, destroyPeriodo } from '../services/periodo.service.js';

export async function createPeriodoCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const item = await createPeriodo(req.body);
        res.status(201).json(item);
    } catch (e) {
        if (e?.original?.constraint === 'periodo_sin_solape') return res.status(409).json({ message: 'Periodo solapado' });
        if (e?.original?.constraint === 'ux_periodo_unico_abierto') return res.status(409).json({ message: 'Ya existe un periodo abierto para empresa+tipo' });
        next(e);
    }
}

export async function listPeriodosCtrl(req, res, next) {
    try {
        const data = await listPeriodos(req.query);
        res.json(data);
    } catch (e) { next(e); }
}

export async function getPeriodoCtrl(req, res, next) {
    try {
        const item = await getPeriodo(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) { next(e); }
}

export async function updatePeriodoCtrl(req, res, next) {
    try {
        const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const item = await updatePeriodo(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        if (e?.original?.constraint === 'periodo_sin_solape') return res.status(409).json({ message: 'Periodo solapado' });
        if (e?.original?.constraint === 'ux_periodo_unico_abierto') return res.status(409).json({ message: 'Ya existe un periodo abierto para empresa+tipo' });
        next(e);
    }
}

export async function cierrePeriodoCtrl(req, res, next) {
    try {
        const ok = await cerrarPeriodo(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Periodo cerrado correctamente' });
    } catch (e) { next(e); }
}

export async function destroyPeriodoCtrl(req, res, next) {
    try {
        const ok = await destroyPeriodo(req.params.id);
        if(!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Periodo eliminado' })
    } catch (e) { next(e); }
}