import { validationResult } from 'express-validator';
import {createCentroCosto, getCentroCosto, listCentrosCosto, updateCentroCosto, deleteCentroCosto,
    getSubtree, listRoots, listChildren, moveCentroCosto
} from '../services/centro-costo.service.js';
import { CentroCosto } from '../models/index.js';
import { todayISO } from '../utils/helpers-fecha-utc.js';

export async function createCentroCostoCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

        const data = await createCentroCosto(req.body);
        res.status(201).json(data);
    } catch (e) {
        if (e?.name === 'SequelizeUniqueConstraintError')
        return res.status(409).json({ message: 'Registro duplicado' });
        next(e);
    }
}

export async function listCentrosCostoCtrl(_req, res, next) {
    try {
        res.json(await listCentrosCosto());
    } catch (e) {
        next(e);
    }
}

export async function getCentroCostoCtrl(req, res, next) {
    try {
        const item = await getCentroCosto(req.params.id);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        next(e);
    }
}

export const listRaices = async (req, res, next) => {
    try {
        const items = await listRoots();
        res.json(items);
    } catch (err) { next(err); }
};

export const listHijos = async (req, res, next) => {
    try {
        const items = await listChildren(Number(req.params.id));
        res.json(items);
    } catch (err) { next(err); }
};

export const subtree = async (req, res, next) => {
    try {
        const tree = await getSubtree(Number(req.params.id));
        res.json(tree);
    } catch (err) { next(err); }
};

export const moveCentro = async (req, res, next) => {
    try {
        const moved = await moveCentroCosto(Number(req.params.id), req.body.new_parent_id);
        res.json(moved);
    } catch (err) { next(err); }
};

export async function updateCentroCostoCtrl(req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

        const item = await updateCentroCosto(req.params.id, req.body);
        if (!item) return res.status(404).json({ message: 'No encontrado' });
        res.json(item);
    } catch (e) {
        next(e);
    }
}

export async function deleteCentroCostoCtrl(req, res, next) {
    try {
        const ok = await deleteCentroCosto(req.params.id);
        if (!ok) return res.status(404).json({ message: 'No encontrado' });
        res.json({ message: 'Centro de costo eliminado' });
    } catch (e) {
        next(e);
    }
}

const yn = (v) => (v ? 'Sí' : 'No');

export async function exportCentrosCosto(req, res) {
    try {
        const centros = await CentroCosto.findAll({
        where: { activo: true },
        order: [['id_centro', 'ASC']],
        raw: true,
        });

        const byId = new Map(centros.map(c => [c.id_centro, c]));

        const rows = centros.map(c => {
        const p = c.parent_id ? byId.get(c.parent_id) : null;
        return [
            c.id_centro ?? '',
            c.nombre_centro ?? '',
            c.serie ?? '',
            yn(!!c.activo),
            c.parent_id ?? '',
            p?.nombre_centro ?? '',
        ];
        });

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Centros');

        ws.addRow(['Centros de costo']);
        ws.addRow([`Fecha de generación: ${todayISO()}`]);
        ws.addRow(['']);
        const headerLines = ws.rowCount;

        const HEAD = ['ID', 'Nombre', 'Serie', 'Activo', 'Padre (ID)', 'Padre (Nombre)'];
        const headRow = ws.addRow(HEAD);

        headRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        };
        });

        for (const r of rows) ws.addRow(r);

        const headRowNumber = headerLines + 1;
        ws.autoFilter = { from: { row: headRowNumber, column: 1 }, to: { row: headRowNumber, column: HEAD.length } };
        ws.views = [{ state: 'frozen', ySplit: headRowNumber }];

        ws.getColumn(1).width = 10;
        ws.getColumn(2).width = 40; 
        ws.getColumn(3).width = 14; 
        ws.getColumn(4).width = 10; 
        ws.getColumn(5).width = 12; 
        ws.getColumn(6).width = 40; 

        const filename = `centros_costo_${todayISO()}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('exportCentrosCostoXlsx ERROR:', err);
        if (!res.headersSent) return res.status(500).json({ ok: false, message: err?.message ?? 'Error exportando centros' });
        res.end();
    }
}