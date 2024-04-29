// app.js

const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');

require('dotenv').config();
const { getReports, updateReport, getDesc, insertImage, getPuntos, updateEmp, getRanking, getCompras, insertCompra } = require('./dbconnection');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// expressy cors
app.use(express.static('public'));
//app.use(express.json());
app.use(cors());

app.use(bodyParser.json({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//esta endpoint usa la api de gemini y nos genera un tema central del reporte
// endpoint para generar temas de reportes utilizando la IA de Google
app.get('/temas', async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(process.env.API_KEY);
        const descriptions = await getDesc();
        const temas = await Promise.all(descriptions.map(async (desc, index) => {
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `El siguiente texto es un reporte generado por un empleado sobre el estado de los productos de la compañía en una tienda, resume el tema del reporte en una sola palabra: ${desc.descripcion}`;
            const result = await model.generateContent(prompt);
            const text = await result.response.text();
            return { descripcion: desc.descripcion, tema: text.trim() };
        }));
        res.json(temas);
    } catch (err) {
        console.error('Error generando temas:', err);
        res.status(500).send('Error generando temas');
    }
});

// endpoint para obtener todos los reportes ordenados
app.get('/reports', async (req, res) => {
    try {
        const sortBy = req.query.sortBy || 'fechaGenerado';
        const sortOrder = req.query.sortOrder || 'DESC';
        const reports = await getReports(sortBy, sortOrder);
        res.json(reports);
    } catch (err) {
        console.error('Error al obtener reportes ordenados:', err);
        res.status(500).send('Error al obtener reportes ordenados');
    }
});


// endpoint para actualizar un reporte usando su ID
app.put('/reports/:id', async (req, res) => {
    const reportId = req.params.id;
    try {
        await updateReport(reportId, req.body);
        res.json({ message: 'Reporte actualizado' });
    } catch (err) {
        console.error('No se pudo actualizar el reporte:', err);
        res.status(500).send('Error actualizando el reporte');
    }
});

// Ruta usada en unity para subir reporte
app.post('/reporte', (req, res) => {
    const base64Image = req.body.image;
    const empleadoID =  req.body.empleadoID;
    const sucursalID =  req.body.sucursalID;
    const prioridadID =  req.body.prioridadID;
    const estadoID =  req.body.estadoID;
    const descripcion =  req.body.descripcion;
    const imageBuffer = Buffer.from(base64Image, 'base64');
    try {
         insertImage(imageBuffer,empleadoID,sucursalID,prioridadID,estadoID,descripcion)
            .then(() => res.status(200).send('Imagen recibida y guardada'))
            .catch(err => res.status(500).send('Error al guardar la imagen'));
        } catch (err) {
            console.error('Error al insertar reporte:', err);
            res.status(500).send('Error al insertar reporte');
        }
});

// endpoint para obtener puntos y monedas de un empleado
app.get('/puntos/:id', async (req, res) => {
    try {
        const empleadoID = req.params.id;
        const puntos = await getPuntos(empleadoID);
        res.json(puntos);
    } catch (err) {
        console.error('Error al obtener puntos:', err);
        res.status(500).send('Error al recuperar puntos de la base de datos');
    }
});

// endpoint para obtener el ranking de los diez empleados con mas puntos
app.get('/ranking', async (req, res) => {
    try {
        const ranking = await getRanking();
        res.json(ranking);
    } catch (err) {
        console.error('Error al obtener el ranking:', err);
        res.status(500).send('Error al recuperar el ranking de la base de datos');
    }
});

// endpoint para actualizar puntos de un empleado
app.post('/updatePoints', async (req, res) => {
    const { empleadoID, additionalPoints } = req.body;
    if (!empleadoID || isNaN(Number(empleadoID)) || Number(empleadoID) <= 0 || additionalPoints <= 0) {
        return res.status(400).send('Datos de entrada no validos');
    }
    try {
        const updateSuccess = await updateEmp(empleadoID, additionalPoints);
        if (updateSuccess) {
            res.send({ message: 'Puntos actualizados correctamente.' });
        } else {
            return res.status(404).send('Empleado no encontrado o sin puntos actualizados');
        }
    } catch (error) {
        console.error('Error al actualizar puntos:', error);
        res.status(500).send('Fallo al actualizar puntos');
    }
});

app.get('/compras/:id', async (req, res) => {
    try {
      const empleadoID = req.params.id;
      const compras = await getCompras(empleadoID);
      res.json(compras);
    } catch (err) {
        console.error('Failed to get compras:', err);
        res.status(500).send('Error retrieving compras from the database');
    }
  });

  app.post('/compra', (req, res) => {
    const empleadoID =  req.body.empleadoID;
    const articuloID =  req.body.articuloID;
    const costo =  req.body.costo;
    try {
         insertCompra(empleadoID,articuloID,costo)
            .then(() => res.status(200).send('Compra fue agregada'))
            .catch(err => res.status(500).send('Error saving compra'));
    } catch (err) {
        console.error('Failed to insert compra:', err);
        res.status(500).send('Error Inserting compra');
    }
});
