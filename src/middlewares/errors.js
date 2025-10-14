// Middleware 404: rutas no encontradas
export function notFoundHandler(req, res, next) {
    res.status(404).json({
        ok: false,
        status: 404,
        message: 'Ruta no encontrada',
    });
}

// Middleware global de manejo de errores
export function errorHandler(err, req, res, next) {
    console.error('Error capturado:', err);

    let status = Number(err.status) || 500;
    let message = err.message || 'Error interno del servidor';
    let details;

    // Normaliza errores comunes de Sequelize
    switch (err.name) {
        case 'SequelizeValidationError':
        case 'SequelizeUniqueConstraintError':
        case 'SequelizeForeignKeyConstraintError':
        status = 400;
        message = message || 'Error de validación';
        details = err.errors?.map(e => ({
            message: e.message,
            path: e.path,
            value: e.value,
            type: e.type,
        }));
        break;

        case 'SequelizeDatabaseError':
        status = status < 500 ? status : 400;
        message = 'Error de base de datos';
        break;

        default:
        break;
    }

    if (res.headersSent) return next(err);

    res.status(status).json({
        ok: false,
        status,
        message,
        ...(details && { details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}