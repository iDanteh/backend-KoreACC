import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Cuenta = sequelize.define(
  "Cuenta",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    codigo: { type: DataTypes.STRING, allowNull: false, unique: true },

    nombre: { type: DataTypes.STRING, allowNull: false },

    // clasificación contable para apertura/cierre
    tipo: {
      type: DataTypes.ENUM("ACTIVO","PASIVO","CAPITAL","INGRESO","GASTO"),
      allowNull: false,
      field: "tipo",
    },

    // naturaleza contable
    naturaleza: {
      type: DataTypes.ENUM("DEUDORA","ACREEDORA"),
      allowNull: false,
      field: "naturaleza",
    },

    // control operativo
    ctaMayor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "cta_mayor",
    },

    posteable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "posteable",
    },

    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "parent_id",
      references: { model: "cuentas", key: "id" },
    },

    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "deleted",
    },
  },
  {
    tableName: "cuentas",
    timestamps: false,
    defaultScope: { where: { deleted: false } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: [{ name: "codigo" }], unique: true },
      { fields: [{ name: "tipo" }] },
      { fields: [{ name: "naturaleza" }] },
      { fields: [{ name: "parent_id" }] },
    ],
  }
);

Cuenta.hasMany(Cuenta, {
  as: "hijos",
  foreignKey: { name: "parentId", field: "parent_id", allowNull: true },
  onDelete: "SET NULL",
});

Cuenta.belongsTo(Cuenta, {
  as: "padre",
  foreignKey: { name: "parentId", field: "parent_id", allowNull: true },
});

export default Cuenta;