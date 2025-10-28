import Cuenta from "../models/Cuenta.js";
import { httpError } from './helper-poliza.js'

export async function assertCuentaPosteable({ id_cuenta, codigo }, t) {
    if (!id_cuenta && !codigo) {
        throw httpError("id_cuenta o codigo de cuenta requerido");
    }

    const where = id_cuenta ? { id: id_cuenta } : { codigo };
    const cuenta = await Cuenta.scope("withDeleted").findOne({
        where,
        transaction: t,
    });

    if (!cuenta) throw httpError("Cuenta no encontrada", 404);
    if (cuenta.deleted) {
        throw httpError(
        `La cuenta ${cuenta.codigo} - ${cuenta.nombre} está inactiva`,
        409
        );
    }
    if (!cuenta.posteable) {
        throw httpError(
        `La cuenta ${cuenta.codigo} - ${cuenta.nombre} no es posteable; usa una subcuenta específica`,
        422
        );
    }

    return { cuenta, id_cuenta: cuenta.id };
}