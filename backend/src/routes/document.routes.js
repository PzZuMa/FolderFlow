import express from 'express';
import * as documentController from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Documents
 *   description: Operaciones sobre documentos
 */

/**
 * @swagger
 * /documents/upload-url:
 *   post:
 *     summary: Obtener URL para subir un documento
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: URL de subida generada correctamente
 */
router.post('/upload-url', documentController.getUploadUrl);

/**
 * @swagger
 * /documents/confirm-upload:
 *   post:
 *     summary: Confirmar la subida de un documento
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Subida confirmada correctamente
 */
router.post('/confirm-upload', documentController.confirmUpload);

/**
 * @swagger
 * /documents:
 *   get:
 *     summary: Listar documentos del usuario
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Lista de documentos
 */
router.get('/', documentController.listUserDocuments);

/**
 * @swagger
 * /documents/{documentId}/download-url:
 *   get:
 *     summary: Obtener URL de descarga de un documento
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: URL de descarga generada correctamente
 */
router.get('/:documentId/download-url', documentController.getDownloadUrl);

/**
 * @swagger
 * /documents/{documentId}:
 *   delete:
 *     summary: Eliminar un documento
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento eliminado correctamente
 */
router.delete('/:documentId', documentController.deleteUserDocument);

/**
 * @swagger
 * /documents/all:
 *   get:
 *     summary: Obtener todos los documentos del usuario
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Lista completa de documentos
 */
router.get('/all', documentController.getAllUserDocuments);

/**
 * @swagger
 * /documents/{documentId}/move:
 *   patch:
 *     summary: Mover un documento a otra carpeta
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetFolderId:
 *                 type: string
 *                 example: 60f7c2e8b4d1c2a5d8e4b456
 *     responses:
 *       200:
 *         description: Documento movido correctamente
 */
router.patch('/:documentId/move', documentController.moveUserDocument);

/**
 * @swagger
 * /documents/recent:
 *   get:
 *     summary: Obtener documentos recientes
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Lista de documentos recientes
 */
router.get('/recent', documentController.getRecentDocs);

/**
 * @swagger
 * /documents/favorites:
 *   get:
 *     summary: Obtener documentos favoritos
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Lista de documentos favoritos
 */
router.get('/favorites', documentController.getFavoriteDocs);

/**
 * @swagger
 * /documents/stats:
 *   get:
 *     summary: Obtener estadísticas de documentos
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 */
router.get('/stats', documentController.getDocStats);

/**
 * @swagger
 * /documents/{documentId}/favorite:
 *   patch:
 *     summary: Marcar o desmarcar un documento como favorito
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Estado de favorito actualizado
 */
router.patch('/:documentId/favorite', documentController.toggleFavorite);

/**
 * @swagger
 * /documents/{documentId}:
 *   get:
 *     summary: Obtener detalles de un documento
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Detalles del documento
 */
router.get('/:documentId', documentController.getDocumentById);

/**
 * @swagger
 * /documents/{documentId}/name:
 *   patch:
 *     summary: Actualizar el nombre de un documento
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del documento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nuevo Nombre
 *     responses:
 *       200:
 *         description: Nombre actualizado correctamente
 */
router.patch('/:documentId/name', documentController.updateDocumentName);

export default router;