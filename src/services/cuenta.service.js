// services/cuenta.service.js
 import { Cuenta } from "../models/index.js";

 class CuentaService {
   async crear(data) {
     return await Cuenta.create(data);
   }

   async listar() {
    return await Cuenta.findAll({ where: { deleted: false } });
    // defaultScope ya filtra deleted=false
    return await Cuenta.findAll();
   }

   async obtenerPorId(id) {
    return await Cuenta.findOne({ where: { id } });
   }

   async actualizar(id, data) {
     const cuenta = await this.obtenerPorId(id);
     if (!cuenta) throw new Error("Cuenta no encontrada");
     return await cuenta.update(data);
   }

   async eliminar(id) {
     const cuenta = await this.obtenerPorId(id);
     if (!cuenta) throw new Error("Cuenta no encontrada");
     return await cuenta.update({ deleted: true });
   }
 }

 export default new CuentaService();
