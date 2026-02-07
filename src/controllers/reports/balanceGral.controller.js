import { getBalanceGeneral } from '../../services/reports/balanceGral.service.js';
import ExcelJS from 'exceljs';
import { getEmpresaInfo } from '../../utils/empresainf.js';
import { todayISO } from '../../utils/helpers-fecha-utc.js';

export async function balanceGeneral(req, res) {
    try {
        const periodoIni = parseInt(req.query.periodo_ini, 10);
        const periodoFin = parseInt(req.query.periodo_fin, 10);

        if (Number.isNaN(periodoIni) || Number.isNaN(periodoFin)) {
            return res.status(400).json({ error: 'Parametros inválidos'})
        }

        if (periodoIni > periodoFin) {
            return res.status(400).json({ error: 'Parametros inválidos'})
        }

        const data = await getBalanceGeneral({ periodoIni, periodoFin});
        return res.json({ ok: true, count: data.length, data});
    } catch (error) {
        console.log('Error en balance general: ', error)
        return res.status(500).json({ ok: false, error: 'Error interno'});
    }
}

export async function exportBalance(req, res) {
    try {
        const periodoIni = Number(req.query.periodoIni);
        const periodoFin = Number(req.query.periodoFin);

        const EMPRESA = await getEmpresaInfo();
        if (!EMPRESA) return res.status(500).json({ ok:false, message:'Empresa no encontrada' });


        if (!Number.isFinite(periodoIni) || !Number.isFinite(periodoFin)) {
        return res.status(400).json({ ok: false, message: 'periodoIni/periodoFin inválidos' });
        }
        if (periodoFin < periodoIni) {
        return res.status(400).json({ ok: false, message: 'Rango de periodos inválido' });
        }

        const rows = await getBalanceGeneral({ periodoIni, periodoFin });

        const wb = new ExcelJS.Workbook();
        wb.creator = 'KoreACC';
        wb.created = new Date();

        const ws = wb.addWorksheet('Balance');

        const headerRows = [];

        headerRows.push([EMPRESA.razon_social ?? '']);
        headerRows.push([`RFC: ${EMPRESA.rfc ?? ''}`]);

        if (EMPRESA.domicilio_fiscal) headerRows.push([`Domicilio: ${EMPRESA.domicilio_fiscal}`]);

        const contactoParts = [];
        if (EMPRESA.telefono) contactoParts.push(`Tel: ${EMPRESA.telefono}`);
        if (EMPRESA.correo_contacto) contactoParts.push(`Correo: ${EMPRESA.correo_contacto}`);
        if (contactoParts.length) headerRows.push([contactoParts.join('   ')]);

        headerRows.push(['']);

        headerRows.push(['Balance general']);
        headerRows.push([`Periodos: p${periodoIni} a p${periodoFin}`]);
        headerRows.push([`Fecha de generación: ${todayISO()}`]);
        headerRows.push(['']);

        for (const r of headerRows) ws.addRow(r);

        const headerLines = headerRows.length;

        const titleRowNumber = headerRows.findIndex(r => r[0] === 'Balance general') + 1;
        if (titleRowNumber > 0) {
        const cell = ws.getCell(titleRowNumber, 1);
        cell.font = { bold: true, size: 16 };
        cell.alignment = { horizontal: 'left' };
        }

        const HEAD = ['Tipo', 'Código', 'Nombre / Grupo', 'Deudor', 'Acreedor'];
        const headRow = ws.addRow(HEAD);

        headRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            bottom: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            left: { style: 'thin', color: { argb: 'FFAAAAAA' } },
            right: { style: 'thin', color: { argb: 'FFAAAAAA' } },
        };
        });

        for (const r of rows) {
        const nivel = r.nivel ?? 'DETALLE';
        const tipo = r.tipo ?? '';
        const codigo = nivel === 'DETALLE' ? (r.codigo ?? '') : '';
        const nombre =
            nivel === 'SUBTOTAL' ? `Subtotal ${tipo}` :
            nivel === 'TOTAL' ? 'TOTAL' :
            (r.nombre ?? '');

        const row = ws.addRow([
            tipo,
            codigo,
            nombre,
            Number(r.saldo_deudor ?? 0),
            Number(r.saldo_acreedor ?? 0),
        ]);

        row.getCell(4).numFmt = '#,##0.00';
        row.getCell(5).numFmt = '#,##0.00';
        row.getCell(4).alignment = { horizontal: 'right' };
        row.getCell(5).alignment = { horizontal: 'right' };
        }

        const det = rows.filter(x => x.nivel === 'DETALLE');
        const totDetDeudor = det.reduce((s, x) => s + Number(x.saldo_deudor ?? 0), 0);
        const totDetAcreedor = det.reduce((s, x) => s + Number(x.saldo_acreedor ?? 0), 0);

        const totalsRow = ws.addRow(['Totales (DETALLE)', '', '', totDetDeudor, totDetAcreedor]);
        totalsRow.font = { bold: true };
        totalsRow.eachCell((cell, col) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        cell.alignment = { horizontal: col >= 4 ? 'right' : 'left' };
        });
        totalsRow.getCell(4).numFmt = '#,##0.00';
        totalsRow.getCell(5).numFmt = '#,##0.00';

        const headRowNumber = headerLines + 1;
        ws.autoFilter = {
        from: { row: headRowNumber, column: 1 },
        to: { row: headRowNumber, column: 5 },
        };
        ws.views = [{ state: 'frozen', ySplit: headRowNumber }];

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 16;
        ws.getColumn(3).width = 45;
        ws.getColumn(4).width = 16;
        ws.getColumn(5).width = 16;

        const empresaSlug = (EMPRESA.razon_social ?? 'empresa').replace(/[^\w\d]+/g, '_');
        const filename = `${empresaSlug}_BalanceGeneral_p${periodoIni}-p${periodoFin}_${todayISO()}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await wb.xlsx.write(res);
        res.end();
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Error exportando balance general' });
    }
}