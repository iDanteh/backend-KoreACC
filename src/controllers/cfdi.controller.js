import { importCfdiXml, getCfids } from '../services/cfdi.service.js';

export async function importCfdi(req, res, next) {
    try {
        const xml =
        req.file ? req.file.buffer.toString('utf8') :
        typeof req.body === 'string' ? req.body :
        null;

        if (!xml) return res.status(400).json({ error: 'XML requerido (archivo o body)' });
        if (/<!DOCTYPE/i.test(xml)) return res.status(400).json({ error: 'DOCTYPE no permitido' });

        const result = await importCfdiXml(xml, { replaceConcepts: true, storeXml: true });
        res.json(result);
    } catch (err) { next(err); }
}

export async function listCfdis(req, res, next) {
    try {
        const { estatus } = req.query;
        let parsedStatus;
        if (typeof estatus !== 'undefined') {
            if (estatus === 'true' || estatus === '1') parsedStatus = true;
            else if (estatus === 'false' || estatus === '0') parsedStatus = false;
            else return res.status(400).json({ error: 'Parámetro estatus inválido (use true|false)' });
        }

        const result = await getCfids({ estatus: parsedStatus });
        res.json(result);
    } catch (err) { next(err); }
}