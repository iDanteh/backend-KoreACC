import * as movimientoService from '../services/movimientoPoliza.service.js';

export const createMovimiento = async (req, res, next) => {
    try {
        const result = await movimientoService.createMovimiento(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getMovimiento = async (req, res, next) => {
    try {
        const result = await movimientoService.getMovimiento(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const listMovimientos = async (req, res, next) => {
    try {
        const result = await movimientoService.listMovimientos(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const updateMovimiento = async (req, res, next) => {
    try {
        const result = await movimientoService.updateMovimiento(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const deleteMovimiento = async (req, res, next) => {
    try {
        const result = await movimientoService.deleteMovimiento(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const replaceAllForPoliza = async (req, res, next) => {
    try {
        const result = await movimientoService.replaceAllForPoliza(req.params.id_poliza, req.body.movimientos);
        res.json(result);
    } catch (err) {
        next(err);
    }
};
