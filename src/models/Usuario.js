import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/db.js';
import bcrypt from 'bcryptjs';

export class Usuario extends Model {
  async validarContrasena(plain) {
    return bcrypt.compare(plain, this.contrasena);
  }
}

Usuario.init({
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido_p: { type: DataTypes.STRING(100), allowNull: false },
    apellido_m: { type: DataTypes.STRING(100) },
    correo: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    telefono: { type: DataTypes.STRING(20) },
    usuario: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    contrasena: { type: DataTypes.STRING(255), allowNull: false },
    estatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fecha_inactivacion: { type: DataTypes.DATE },
    fecha_modificacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    modificado_por: { type: DataTypes.INTEGER, allowNull: true },
    debe_cambiar_contrasena: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    ultimo_cambio_contrasena: { type: DataTypes.DATE, allowNull: true },
    }, {
    sequelize,
    tableName: 'usuario',
    hooks: {
        beforeCreate: async (user) => {
        if (user.contrasena) {
            user.contrasena = await bcrypt.hash(user.contrasena, 10);
        }
        },
        beforeUpdate: async (user) => {
        if (user.changed('contrasena')) {
            user.contrasena = await bcrypt.hash(user.contrasena, 10);
        }
        user.fecha_modificacion = new Date();
        },
    },
});