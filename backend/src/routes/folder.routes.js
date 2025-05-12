import express from 'express';
import { protect } from '../middleware/auth.middleware.js'; // Importa tu middleware de autenticación
import {
  handleCreateFolder,
  handleListContent,
  handleDeleteFolder,
  handleGetFolderDetails,
  moveUserFolder,
} from '../controllers/folder.controller.js'; // Importa los controladores

const router = express.Router();

// --- Aplicar Middleware de Autenticación a TODAS las rutas de carpetas ---
// Cualquier petición a /api/folders/... primero pasará por 'protect'
router.use(protect);

// --- Definir Rutas ---

// POST /api/folders - Crear una nueva carpeta
// Body: { "name": "NombreCarpeta", "parentId": "ID_Padre_Opcional_O_null" }
router.post('/', handleCreateFolder);

// GET /api/folders - Listar contenido de una carpeta
// Query Params: /api/folders?parentId=ID_Padre (o sin query para la raíz)
// Nota: Se usa GET / en lugar de /root o /?parentId=... para simplificar
//       El controlador ya maneja la ausencia de parentId para obtener la raíz.
router.get('/', handleListContent);

// GET /api/folders/:folderId - Listar contenido de una carpeta específica
// Params: /api/folders/ID_Carpeta
router.get('/:folderId', handleGetFolderDetails); // Si necesitas esta ruta, descomentar y ajustar el controlador


// DELETE /api/folders/:folderId - Eliminar una carpeta
// Params: /api/folders/ID_De_La_Carpeta_A_Eliminar
router.delete('/:folderId', handleDeleteFolder);

router.patch('/:folderId/move', moveUserFolder);


export default router; // Exportar el router configurado