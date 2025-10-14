// routes/cfdi.routes.js
import express from 'express';
import multer from 'multer';
import { importCfdiXml } from '../services/cfdi.service.js';
import { importCfdi } from '../controllers/cfdi.controller.js'
import { linkUuidToMovimientos } from '../services/movimientos-uuid.service.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1 * 1024 * 1024 } });

router.post(
  '/import',
  upload.single('file'),
  express.text({ type: ['application/xml','text/xml','text/plain'], limit: '1mb' }),
  importCfdi
);

router.post('/polizas/:id/movimientos/link-uuid', async (req, res, next) => {
  try {
    const id_poliza = Number(req.params.id);
    const { uuid, movimiento_ids } = req.body;
    const r = await linkUuidToMovimientos({ id_poliza, uuid, movimiento_ids });
    res.json(r);
  } catch (e) { next(e); }
});


export default router;
