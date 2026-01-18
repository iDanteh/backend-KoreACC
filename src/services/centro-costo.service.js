import { CentroCosto, Poliza } from '../models/index.js';
import { httpError } from '../utils/helper-poliza.js';
import { sequelize } from '../config/db.js';

export const createCentroCosto = (data) => CentroCosto.create(data);

export const getCentroCosto = (id) => CentroCosto.findByPk(id);

export const listCentrosCosto = () =>
    CentroCosto.findAll({ order: [['id_centro', 'ASC']], where: { activo: true } });

export const listRoots = async () => {
    const sql = `
        SELECT c.*,
            EXISTS (SELECT 1 FROM centro_costo ch WHERE ch.parent_id = c.id_centro) AS has_children
        FROM centro_costo c
        WHERE c.parent_id IS NULL
        ORDER BY nombre_centro;
    `;
    const [rows] = await sequelize.query(sql);
    return rows;
}

export const listChildren = async (parentId) => {
    const sql = `
        SELECT c.*,
            EXISTS (SELECT 1 FROM centro_costo ch WHERE ch.parent_id = c.id_centro) AS has_children
        FROM centro_costo c
        WHERE c.parent_id = :parentId
        ORDER BY nombre_centro;
    `;
    const [rows] = await sequelize.query(sql, { replacements: { parentId } });
    return rows;
};

export const getSubtree = async (rootId) => {
    const sql = `
        WITH RECURSIVE tree AS (
        SELECT c.*, 0 AS depth
        FROM centro_costo c WHERE c.id_centro = :rootId
        UNION ALL
        SELECT ch.*, t.depth + 1
        FROM centro_costo ch
        JOIN tree t ON ch.parent_id = t.id_centro
        )
        SELECT * FROM tree ORDER BY depth, id_centro;
    `;
    const [rows] = await sequelize.query(sql, { replacements: { rootId } });
    return rows;
};

export const moveCentroCosto = async (id, newParentId) => {
    if (id === newParentId) throw new Error('No puedes asignar el mismo centro como padre.');

    if (newParentId) {
        const sql = `
        WITH RECURSIVE tree AS (
            SELECT c.id_centro
            FROM centro_costo c WHERE c.id_centro = :id
            UNION ALL
            SELECT ch.id_centro
            FROM centro_costo ch
            JOIN tree t ON ch.parent_id = t.id_centro
        )
        SELECT EXISTS(SELECT 1 FROM tree WHERE id_centro = :newParentId) AS would_cycle;
        `;
        const [rows] = await sequelize.query(sql, { replacements: { id, newParentId } });
        if (rows[0].would_cycle) throw new Error('Movimiento inválido: crearía un ciclo.');
    }

    await CentroCosto.update({ parent_id: newParentId ?? null }, { where: { id_centro: id } });
    return CentroCosto.findByPk(id);
};

export const updateCentroCosto = async (id, updates) => {
    const item = await CentroCosto.findByPk(id);
    if (!item) return null;
    await item.update({ ...updates, updated_at: new Date() });
    return item;
};

export const deleteCentroCosto = async (id) => {
    const linkedPoliza = await Poliza.findOne({ where: { id_centro: id } });
    if (linkedPoliza) {
        throw httpError('No se puede eliminar el centro de costo porque tiene pólizas asociadas.', 409);
    }

    const item = await CentroCosto.findByPk(id);
    if (!item) return null;
    await item.update({ activo: false });
    return true;
};