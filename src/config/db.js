import { Sequelize } from 'sequelize';
import { env } from './env.js';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.pass, {
    host: env.db.host,
    port: env.db.port,
    dialect: 'postgres',
    logging: env.nodeEnv === 'development' ? console.log : false,
    define: {
        freezeTableName: true,
        underscored: true,
        timestamps: false,
    },
});