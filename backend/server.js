// 1. Importar paquetes
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// --- IMPORTANTE: Mover importaciones de rutas aquí arriba ---
import authRoutes from './src/routes/auth.routes.js';
import folderRoutes from './src/routes/folder.routes.js';
import documentRoutes from './src/routes/document.routes.js'; // <<< Nueva importación

// 2. Cargar variables de entorno
dotenv.config();

// 3. Importar función para conectar DB
import { connectDB } from './src/config/database.js'; // Asegúrate que database.js use export

// 4. Conectar a la base de datos
connectDB(); // Llamar a la función

// 5. Crear la instancia de Express
const app = express();

// 6. Middleware esencial
// Configura CORS según tus necesidades (orígenes permitidos, métodos, etc.)
// Para desarrollo, esto suele ser suficiente:
app.use(cors());
// Para producción, sé más específico:
// app.use(cors({
//   origin: 'http://tu-dominio-frontend.com', // o ['http://localhost:4200', 'http://tu-dominio.com']
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(express.json()); // Para parsear el body en formato JSON
app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb' // Aumenta el límite para URL-encoded (base64 images)
})); // Para parsear bodies urlencoded si es necesario
app.use(express.json({ 
  limit: '10mb' // Aumenta el límite para JSON (base64 images)
}));

// 7. Ruta de prueba simple (opcional)
app.get('/', (req, res) => {
  res.send('API del Sistema de Gestión Documental (SGD-TFG) Funcionando');
});

// 8. Rutas de la API (Agrupadas)
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/documents', documentRoutes); // <<< Registrar las nuevas rutas de documentos

// 9. Manejador de Errores Global (¡MUY IMPORTANTE! Debe ir DESPUÉS de las rutas)
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message); // Log básico del mensaje de error
  console.error('STACK:', err.stack); // Log del stacktrace para debugging

  // Determinar el status code basado en el tipo de error o propiedad statusCode
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  // Mensaje de error a enviar al cliente
  const errorMessage = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    message: errorMessage,
    // Puedes añadir más detalles en entorno de desarrollo si lo necesitas
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});


// 10. Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});