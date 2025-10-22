import * as polizaService from '../services/poliza.service.js';
import { expandEventoToMovimientos } from '../services/asientos-motor.js';
import { normalizeMovimientosInput } from '../utils/mov-normalizer.js';

export const createPoliza = async (req, res, next) => {
  try {
    const { movimientos = [], ...payload } = req.body;

    // Normaliza antes de pasar al service original
    const movs = normalizeMovimientosInput(movimientos, {
      defaultFecha: payload.fecha_creacion ?? payload.fecha ?? null,
      defaultCc:    req.body.cc ?? payload.id_centro ?? null,
      uiCargoEs0:   true, // por tu UI actual
    });

    const result = await polizaService.createPoliza(payload, { movimientos: movs });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const createPolizaFromEventoFlat = async (req, res, next) => {
    try {
        const b = req.body || {};
        const polizaPayload = polizaService.buildPolizaPayloadFromFlatBody(b);
        const evento = polizaService.buildEventoFromFlatBody(b);

        let movimientos = await expandEventoToMovimientos(evento);

        const { cliente = null, ref_serie_venta = null } = b;
        if (cliente !== null || ref_serie_venta !== null) {
        movimientos = movimientos.map(m => ({
            ...m,
            cliente: (cliente !== null ? cliente : m.cliente),
            ref_serie_venta: (ref_serie_venta !== null ? ref_serie_venta : m.ref_serie_venta),
        }));
        }

        const pol = await polizaService.createPoliza(polizaPayload, { movimientos });
        res.status(201).json(pol);
    } catch (err) {
        next(err);
    }
};

export const expandEventoAndAddMovimientosFlat = async (req, res, next) => {
    try {
        const id_poliza = Number(req.params.id);
        const b = req.body || {};

        const evento = polizaService.buildEventoFromFlatBody(b);

        let movimientos = await expandEventoToMovimientos(evento);

        const { cliente = null, ref_serie_venta = null } = b;
        if (cliente !== null || ref_serie_venta !== null) {
        movimientos = movimientos.map(m => ({
            ...m,
            cliente: (cliente !== null ? cliente : m.cliente),
            ref_serie_venta: (ref_serie_venta !== null ? ref_serie_venta : m.ref_serie_venta),
        }));
        }

        const result = await polizaService.addMovimientosToPoliza(id_poliza, movimientos);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const getPoliza = async (req, res, next) => {
    try {
        const includeMovimientos = req.query.includeMovimientos === 'true';
        const withFk = req.query.withFk === 'true';
        const result = await polizaService.getPoliza(req.params.id, { includeMovimientos, withFk });
        res.json(result);
    } catch (err) {
        next(err);
    }
};

export const listPolizas = async (req, res, next) => {
    try {
        const withFk    = req.query.withFk !== 'false';
        const flatten   = req.query.flatten !== 'false';
        const includeMovimientos = req.query.includeMovimientos === 'true';

        const result = await polizaService.listPolizas({
        ...req.query,
        withFk,
        flatten,
        includeMovimientos,
        });
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

export const changePolizaRevisada = async (req, res, next) => {
    try {
        const result = await polizaService.changePolizaRevisada(req.params.id);
        res.json(result);
    } catch (error) {
        next(error);
    }
}

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