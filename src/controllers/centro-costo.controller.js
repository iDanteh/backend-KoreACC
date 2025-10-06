import { validationResult } from 'express-validator';
import {createCentroCosto, getCentroCosto, listCentrosCosto, updateCentroCosto, deleteCentroCosto,} from '../services/centro-costo.service.js';

export async function createCentroCostoCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

        const data = await createCentroCosto(req.body);
        res.status(201).json(data);
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError')
        return res.status(409).json({ message: 'Registro duplicado' });
        next(e);
    }
}

export async function listCentrosCostoCtrl(_req, res, next) {
    try {
        res.json(await listCentrosCosto());
    } catch (e) {
        next(e);
    }
}

export async function getCentroCostoCtrl(req, res, next) {
    try {
        const item = await getCentroCosto(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        next(e);
    }
}

export async function updateCentroCostoCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

        const item = await updateCentroCosto(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        next(e);
    }
}

export async function deleteCentroCostoCtrl(req, res, next) {
    try {
        const ok = await deleteCentroCosto(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Centro de costo eliminado' });
    } catch (e) {
        next(e);
    }
}
