import * as tipoPolizaService from '../services/tipoPoliza.service.js';

export const createTipoPoliza = async (req, res, next) => {
    try {
        const result = await tipoPolizaService.createTipoPoliza(req.body);
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
};

export const getTipoPoliza = async (req, res, next) => {
    try {
        const result = await tipoPolizaService.getTipoPoliza(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const listTipoPolizas = async (req, res, next) => {
    try {
        const result = await tipoPolizaService.listTipoPolizas(req.query);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const updateTipoPoliza = async (req, res, next) => {
    try {
        const result = await tipoPolizaService.updateTipoPoliza(req.params.id, req.body);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const deleteTipoPoliza = async (req, res, next) => {
    try {
        const result = await tipoPolizaService.deleteTipoPoliza(req.params.id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};