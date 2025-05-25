import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import authRoutes from './src/routes/auth.routes.js';
import folderRoutes from './src/routes/folder.routes.js';
import documentRoutes from './src/routes/document.routes.js';

dotenv.config();

import { connectDB } from './src/config/database.js';

connectDB();

const app = express();

app.use(cors());

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);
app.use(
  express.json({
    limit: '10mb'
  })
);

app.get('/', (req, res) => {
  res.send('API del Sistema de Gestión Documental (SGD-TFG) Funcionando');
});

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/documents', documentRoutes);

app.use((err, req, res, next) => {
  console.error('ERROR:', err.message);
  console.error('STACK:', err.stack);

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const errorMessage = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: errorMessage
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});