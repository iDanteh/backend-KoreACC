// src/models/Cuenta.js
import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Cuenta = sequelize.define(
  "Cuenta",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ctaMayor: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "cuentas",
        key: "id",
      },
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "cuentas",
    timestamps: true,
    defaultScope: { where: { deleted: false } },
    scopes: { withDeleted: {} },
    // <-- sin "indexes"
  }
);

// Relaciones autorreferenciales
Cuenta.hasMany(Cuenta, {
  as: "hijos",
  foreignKey: { name: "parentId", allowNull: true },
  onDelete: "SET NULL",
});
Cuenta.belongsTo(Cuenta, {
  as: "padre",
  foreignKey: { name: "parentId", allowNull: true },
});

export default Cuenta;
