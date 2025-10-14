import * as polizaService from '../services/poliza.service.js';

export const createPoliza = async (req, res, next) => {
    try {
        const { movimientos = [], ...payload } = req.body;
        const result = await polizaService.createPoliza(payload, { movimientos });
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getPoliza = async (req, res, next) => {
    try {
        const includeMovimientos = req.query.includeMovimientos === 'true';
        const result = await polizaService.getPoliza(req.params.id, { includeMovimientos });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const listPolizas = async (req, res, next) => {
    try {
        const result = await polizaService.listPolizas(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const updatePoliza = async (req, res, next) => {
    try {
        const result = await polizaService.updatePoliza(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const deletePoliza = async (req, res, next) => {
    try {
        const result = await polizaService.deletePoliza(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const changeEstadoPoliza = async (req, res, next) => {
    try {
        const result = await polizaService.changeEstadoPoliza(req.params.id, req.body.estado);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const addMovimientoToPoliza = async (req, res, next) => {
    try {
        const result = await polizaService.addMovimientoToPoliza(req.params.id, req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const addMovimientosToPoliza = async (req, res, next) => {
    try {
        const result = await polizaService.addMovimientosToPoliza(req.params.id, req.body.movimientos);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getPolizaWithMovimientos = async (req, res, next) => {
    try {
        const result = await polizaService.getPolizaWithMovimientos(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};