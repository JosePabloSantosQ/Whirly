//dbconnection.js

const sql = require('mssql');

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.SERVER_NAME,
    database: process.env.DB,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

// pool connection
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Conectado a MSSQL');
        return pool;
    })
    .catch(err => {
        console.error('¡Fallo la conexión con la base de datos! Configuración incorrecta: ', err);
    });

// obtiene todos los reportes de la base de datos con opciones de ordenacion
async function getReports(sortBy = 'fechaGenerado', sortOrder = 'DESC') {
    try {
        const pool = await poolPromise;
        const query = `
            SELECT R.*, CONCAT(E.nombre, ' ', E.apellidoPat) as empleadoNombre, F.foto, S.nombreTienda as nombreSucursal
            FROM Reporte R
            LEFT JOIN Foto F ON R.reporteID = F.reporteID
            INNER JOIN Sucursal S ON R.sucursalID = S.sucursalID
            LEFT JOIN Empleado E ON R.empleadoRealizaID = E.empleadoID
            ORDER BY R.${sortBy} ${sortOrder}`;
        const result = await pool.request().query(query);
        return result.recordset.map(record => {
            if (record.foto) {
                const binaryImageData = record.foto;
                const base64Image = Buffer.from(binaryImageData).toString('base64');
                record.imageData = `data:image/jpeg;base64,${base64Image}`;
            }
            return record;
        });
    } catch (err) {
        console.error('Error al obtener los reportes:', err);
        throw err;
    }
}

// obtiene las descripciones de los reportes con ordenacion especificada
async function getDesc(sortBy = 'fechaGenerado', sortOrder = 'DESC') {
    try {
        const pool = await poolPromise;
        const query = `SELECT descripcion FROM Reporte ORDER BY ${sortBy} ${sortOrder}`;
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (err) {
        throw err;
    }
}

// actualiza un reporte existente basado en el ID y los datos que hay
async function updateReport(reportId, reportData) {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('reportId', sql.Int, reportId);

        if (parseInt(reportData.estadoID) === 3) {
            reportData.fechaResolucion = new Date();
            request.input('fechaResolucion', sql.DateTime, reportData.fechaResolucion);
        }

        let updates = ['prioridadID = @prioridadID', 'estadoID = @estadoID', 'promotorID = @promotorID'];
        if (reportData.fechaResolucion) {
            updates.push('fechaResolucion = @fechaResolucion');
        }

        request.input('prioridadID', sql.Int, reportData.prioridadID);
        request.input('estadoID', sql.Int, reportData.estadoID);
        request.input('promotorID', sql.Int, reportData.promotorID);

        const updateSet = updates.join(', ');
        const sqlQuery = `UPDATE Reporte SET ${updateSet} WHERE reporteID = @reportId`;
        const result = await request.query(sqlQuery);
    } catch (err) {
        console.error('No se pudo actualizar el reporte:', err);
        throw err;
    }
}



// inserta una imagen y datos de reporte en la base de datos
async function insertImage(imageBuffer, empleadoID, sucursalID, prioridadID, estadoID, descripcion) {
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('empleadoRealizaID', sql.Int, empleadoID);
        request.input('descripcion', sql.VarChar(8000), descripcion);
        request.input('sucursalID', sql.Int, sucursalID);
        request.input('prioridadID', sql.Int, prioridadID);
        request.input('estadoID', sql.Int, estadoID);
        request.input('foto', sql.VarBinary, imageBuffer);
        await request.execute('SpSubirReporte');
    } catch (err) {
        console.error('Error al insertar imagen:', err);
    } finally {
        sql.close();
    }
}

// obtiene los puntos y monedas de un empleado especifico
async function getPuntos(empleadoID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('empleadoID', sql.Int, empleadoID)
            .query('SELECT puntos, monedas FROM Empleado WHERE empleadoID = @empleadoID');
        return result.recordset;
    } catch (err) {
        console.error('Error al ejecutar la consulta de puntos:', err);
        throw err;
    }
}

// obtiene el ranking de los diez empleados con mas puntos
async function getRanking() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query("SELECT TOP 10 CONCAT(nombre, ' ',apellidoPat, ' ', apellidoMat) as nombre, puntos FROM Empleado ORDER BY puntos DESC");
        return result.recordset;
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        throw err;
    }
}

// ejecuta un procedimiento almacenado para actualizar los puntos de un empleado
async function updateEmp(empleadoID, additionalPoints) {
    try {
        const pool = await poolPromise;
        const request = pool.request();
        request.input('empleadoID', sql.Int, empleadoID);
        request.input('cantidadPuntos', sql.Int, additionalPoints);
        const result = await request.execute('SpDarPuntos');
        return result.rowsAffected[0] > 0;
    } catch (error) {
        console.error('Error al ejecutar el procedimiento almacenado:', error);
        throw new Error('Fallo al actualizar los puntos');
    }
}             

async function insertCompra(empleadoID,articuloID,costo) {
    try {
	await sql.connect(config);
        const request = new sql.Request();
        request.input('empleadoID', sql.Int, empleadoID);
        request.input('articuloID', sql.Int, articuloID);
        request.input('costo', sql.Int, costo);
        await request.execute('SpComprarArticulo');
    } catch (err) {
        console.error('Error inserting image:', err);
    } finally {
        sql.close();
    }
}

async function getCompras(empleadoID) {
    try {
        const pool = await poolPromise;
        console.log('Connected to the database.');

        const result = await pool.request()
            .input('empleadoID', sql.Int, empleadoID)
            .query('SELECT articuloID FROM ArticulosComprados WHERE empleadoID = @empleadoID');
        console.log('Query executed successfully.');
        return result.recordset;
    } catch (err) {
        console.error('Error executing query:', err);
        throw err;
    }
} 
// export 
module.exports = {
    getReports,
    updateReport,
    getDesc,
    insertImage,
    getPuntos,
    getRanking,
    updateEmp,
    insertCompra,
    getCompras
  };