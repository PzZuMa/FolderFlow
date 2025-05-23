import express from 'express';
import * as folderController from '../controllers/folder.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(protect);

// CORRECCIÓN: Mover esta ruta ANTES de las rutas con parámetros dinámicos
// GET /api/folders/stats - Obtener estadísticas de carpetas
router.get('/stats', folderController.handleGetFolderStats);

// Crear carpeta
router.post('/', folderController.handleCreateFolder);
// Listar contenido de carpeta
router.get('/', folderController.handleListContent);
// Detalles de carpeta específica
router.get('/:folderId', folderController.handleGetFolderDetails);
// Eliminar carpeta
router.delete('/:folderId', folderController.handleDeleteFolder);
// Mover carpeta
router.patch('/:folderId/move', folderController.moveUserFolder);

router.post('/by-ids', folderController.getFoldersByIds);

router.patch('/:folderId/name', folderController.updateFolderName);



export default router;