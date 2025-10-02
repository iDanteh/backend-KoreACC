// controllers/periodo-autogen.controller.js
import { validationResult } from 'express-validator';
import { generarPeriodosDesdeMesActual } from '../services/periodo-autogen.service.js';

export async function generarPeriodosCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.length) {}
        else return res.status(400).json({ errors: errors.array() });

        const { id_ejercicio, frecuencia } = req.body;

        const resultado = await generarPeriodosDesdeMesActual({
        id_ejercicio: Number(id_ejercicio),
        frecuencia,
        });

        res.status(201).json(resultado);
    } catch (e) { next(e); }
}
