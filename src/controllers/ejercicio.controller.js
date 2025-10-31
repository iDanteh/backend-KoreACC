// controllers/ejercicio.controller.js
import { validationResult } from 'express-validator';
import {createEjercicio,getEjercicio,listEjercicios,updateEjercicio,deleteEjercicio,abrirEjercicio,cerrarEjercicio,} from '../services/ejercicio.service.js';

export async function createEjercicioCtrl(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const item = await createEjercicio(req.body);
    res.status(201).json(item);
  } catch (e) {
    if (e?.original?.constraint === 'ux_ejercicio_empresa_anio') {
      return res.status(409).json({ message: 'Ya existe un ejercicio para esa empresa y año' });
    }
    if (e.status === 409) return res.status(409).json({ message: e.message });
    next(e);
  }
}

export async function listEjerciciosCtrl(req, res, next) {
  try { res.json(await listEjercicios(req.query)); }
  catch (e) { next(e); }
}

export async function getEjercicioCtrl(req, res, next) {
  try {
    const item = await getEjercicio(req.params.id);
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.json(item);
  } catch (e) { next(e); }
}

export async function updateEjercicioCtrl(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const item = await updateEjercicio(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.json(item);
  } catch (e) {
    if (e?.original?.constraint === 'ux_ejercicio_empresa_anio') {
      return res.status(409).json({ message: 'Ya existe un ejercicio para esa empresa y año' });
    }
    if (e.status === 409) return res.status(409).json({ message: e.message });
    next(e);
  }
}

export async function deleteEjercicioCtrl(req, res, next) {
  try {
    const ok = await deleteEjercicio(req.params.id);
    if (!ok) return res.status(404).json({ message: 'No encontrado' });
    res.json({ message: 'Ejercicio eliminado' });
  } catch (e) { next(e); }
}

export async function abrirEjercicioCtrl(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { cerrar_otros = true } = req.body;
    const item = await abrirEjercicio(req.params.id, { cerrar_otros });
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.json(item);
  } catch (e) { next(e); }
}

export async function cerrarEjercicioCtrl(req, res, next) {
  try {
    const id_ejercicio = Number(req.params.id);
    const { cuentaResultadosId, traspasarACapital, cuentaCapitalId } = req.body;

    const id_usuario = req.user?.id_usuario || req.body.id_usuario;
    const id_centro  = req.user?.id_centro_default || req.body.id_centro;

    if (!id_usuario || !id_centro) {
      return res.status(400).json({ message: 'Se requiere id_usuario e id_centro para cerrar el ejercicio.' });
    }
    if (!cuentaResultadosId) {
      return res.status(400).json({ message: 'Se requiere cuentaResultadosId para generar la póliza de cierre.' });
    }
    if (traspasarACapital && !cuentaCapitalId) {
      return res.status(400).json({ message: 'Indica cuentaCapitalId si traspasarACapital = true.' });
    }

    const out = await cerrarEjercicio({
      id_ejercicio,
      id_usuario,
      id_centro,
      cuentaResultadosId,
      traspasarACapital: !!traspasarACapital,
      cuentaCapitalId: cuentaCapitalId ?? null,
    });

    res.status(200).json(out);
  } catch (e) { next(e); }
}