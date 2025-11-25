import * as polizaService from '../services/poliza.service.js';
import { listPolizaByEjercicio } from '../services/listPolizas/polizasList.service.js';
import { expandEventoToMovimientos } from '../services/asientos-motor.js';
import { listMovimientosByPoliza } from '../services/poliza.service.js';
import { normalizeMovimientosInput } from '../utils/mov-normalizer.js';

// util para ver si cuadra (se mantiene igual)
const esCuadrada = (movs = []) => {
  const n = (v) => (v == null || v === '' ? 0 : Number(v) || 0);
  const debe  = movs.filter(m => String(m.operacion) === '0').reduce((s, m) => s + n(m.monto), 0);
  const haber = movs.filter(m => String(m.operacion) === '1').reduce((s, m) => s + n(m.monto), 0);
  return { ok: Math.abs(debe - haber) <= 0.001 && debe > 0, diff: +(debe - haber).toFixed(2) };
};

export const createPoliza = async (req, res, next) => {
  try {
    const { movimientos = [], ...payload } = req.body;

    const movs = normalizeMovimientosInput(movimientos, {
      defaultFecha: payload.fecha_creacion ?? payload.fecha ?? null,
      defaultCc:    req.body.cc ?? payload.id_centro ?? null,
      uiCargoEs0:   true, // fuerza '0'/'1' como strings
    });

    const { ok, diff } = esCuadrada(movs);

    const base = {
      ...payload,
      estado: payload.estado ?? 'Por revisar',
    };

    if (!ok) base.concepto = `${payload.concepto} [NO CUADRADA Δ=${diff}]`;

    const result = await polizaService.createPolizaPermisiva(base, { movimientos: movs, _diff: diff, _cuadrada: ok });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// --- NUEVA: crear póliza desde EVENTO (body plano)
export const createPolizaFromEventoFlat = async (req, res, next) => {
  try {
    const b = req.body || {};
    const polizaPayload = polizaService.buildPolizaPayloadFromFlatBody(b);
    const evento = polizaService.buildEventoFromFlatBody(b);

    // 1) Genera movimientos desde el motor
    let movimientos = await expandEventoToMovimientos(evento);

    // 2) Aplica defaults opcionales (cliente / ref)
    const { cliente = null, ref_serie_venta = null } = b;
    if (cliente !== null || ref_serie_venta !== null) {
      movimientos = movimientos.map(m => ({
        ...m,
        cliente: (cliente !== null ? cliente : m.cliente),
        ref_serie_venta: (ref_serie_venta !== null ? ref_serie_venta : m.ref_serie_venta),
      }));
    }

    // 3) NORMALIZA para garantizar '0'/'1', fecha y cc
    const movs = normalizeMovimientosInput(movimientos, {
      defaultFecha: b.fecha_operacion ?? null,
      defaultCc:    b.cc ?? b.id_centro ?? null,
      uiCargoEs0:   true, // <-- clave para evitar 500 por validación
    });

    // 4) Usa la versión estricta (si descuadra, lanzará 400/409, no 500)
    const pol = await polizaService.createPoliza(polizaPayload, { movimientos: movs });
    res.status(201).json(pol);
  } catch (err) {
    next(err);
  }
};

// --- NUEVA: agregar movimientos generados por evento a una póliza existente (body plano)
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

    // NORMALIZA antes de insertar
    const movs = normalizeMovimientosInput(movimientos, {
      defaultFecha: b.fecha_operacion ?? null,
      defaultCc:    b.cc ?? null,
      uiCargoEs0:   true,
    });

    const result = await polizaService.addMovimientosToPoliza(id_poliza, movs);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getFolioSiguiente = async (req, res, next) => {
  try {
    const id_tipopoliza = Number(req.query.id_tipopoliza);
    const id_periodo    = Number(req.query.id_periodo);
    const id_centro     = req.query.id_centro != null ? Number(req.query.id_centro) : null;

    const result = await polizaService.getFolioSiguienteService({ id_tipopoliza, id_periodo, id_centro });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

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

export const listPolizasByEjercicioController = async (req, res, next) => {
  try {
    const id_ejercicio = Number(req.params.id_ejercicio || req.params.id);

    if (!id_ejercicio || Number.isNaN(id_ejercicio)) {
      return res.status(400).json({ message: 'id_ejercicio inválido o no proporcionado' });
    }

    const withFk    = req.query.withFk !== 'false';
    const flatten   = req.query.flatten !== 'false';
    const includeMovimientos = req.query.includeMovimientos === 'true';

    const result = await listPolizaByEjercicio(id_ejercicio, {
      ...req.query,
      withFk,
      flatten,
      includeMovimientos,
      id_periodo: undefined,
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

export const listMovimientosByPolizaController = async (req, res, next) => {
  try {
    const id_poliza = Number(req.params.id);
    if (!id_poliza || Number.isNaN(id_poliza)) {
      return res.status(400).json({ message: 'id_poliza inválido' });
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 10);
    const withFk = req.query.withFk !== 'false';

    const result = await listMovimientosByPoliza(id_poliza, {
      page,
      pageSize,
      withFk,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};