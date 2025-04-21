// 1. Importar paquetes
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// 2. Cargar variables de entorno
dotenv.config();

// 3. Importar función para conectar DB
import { connectDB } from './src/config/database.js';

// 4. Conectar a la base de datos
connectDB();

// 5. Crear la instancia de Express
const app = express();

// 6. Middleware esencial
app.use(cors()); // Para permitir peticiones desde el frontend
app.use(express.json()); // Para parsear el body en formato JSON

// 7. Ruta de prueba simple
app.get('/', (req, res) => {
  res.send('API Running');
});

// 8. Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});

import authRoutes from './src/routes/auth.routes.js';

app.use('/api/auth', authRoutes);

