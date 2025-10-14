import { importCfdiXml } from '../services/cfdi.service.js';

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
