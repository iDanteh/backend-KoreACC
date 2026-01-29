import { QueryTypes } from "sequelize";
import { sequelize } from '../config/db.js';

export async function getEmpresaInfo() {
    const sql = `
    SELECT razon_comercial, razon_social, rfc, domicilio_fiscal, telefono, correo_contacto
    FROM empresa WHERE id_empresa = 1 LIMIT 1
    `;
    const [result] = await sequelize.query(sql, {
        type: QueryTypes.SELECT
    });
    return result;
}