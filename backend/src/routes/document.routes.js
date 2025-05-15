import express from 'express';
// Importar todas las funciones exportadas del controlador
import * as documentController from '../controllers/document.controller.js';
// Asumiendo que authMiddleware se exporta como default o nombrado
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(protect);

// --- Rutas ---
router.post('/upload-url', documentController.getUploadUrl);
router.post('/confirm-upload', documentController.confirmUpload);
router.get('/', documentController.listUserDocuments);
router.get('/:documentId/download-url', documentController.getDownloadUrl);
router.delete('/:documentId', documentController.deleteUserDocument);
router.get('/all', documentController.getAllUserDocuments);
router.patch('/:documentId/move', documentController.moveUserDocument);
router.get('/recent', documentController.getRecentDocs);
router.get('/favorites', documentController.getFavoriteDocs);
router.get('/stats', documentController.getDocStats);
router.patch('/:documentId/favorite', documentController.toggleFavorite);


// Exportación por defecto del router
export default router;