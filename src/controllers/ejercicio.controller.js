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
    const item = await cerrarEjercicio(req.params.id);
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.json(item);
  } catch (e) { next(e); }
}