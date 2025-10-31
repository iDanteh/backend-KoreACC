import { validationResult } from 'express-validator';
import { generarPeriodosDesdeMesActual } from '../services/periodo-autogen.service.js';

export async function generarPeriodosCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (errors.length) return res.status(400).json({ errors: errors.array() });

        const { id_ejercicio, frecuencia, id_usuario: idUserBody, id_centro: idCentroBody } = req.body;

        const id_usuario = Number(idUserBody) || req.user?.id_usuario;
        const id_centro  = Number(idCentroBody) || req.user?.id_centro_default;

        const resultado = await generarPeriodosDesdeMesActual({
        id_ejercicio: Number(id_ejercicio),
        frecuencia,
        id_usuario,
        id_centro,
        });

        res.status(201).json(resultado);
    } catch (e) { next(e); }
}