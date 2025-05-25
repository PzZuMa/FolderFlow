import express from 'express';
import * as documentController from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

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
router.get('/:documentId', documentController.getDocumentById);
router.patch('/:documentId/name', documentController.updateDocumentName);

export default router;