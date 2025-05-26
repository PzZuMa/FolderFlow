import express from 'express';
import * as folderController from '../controllers/folder.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Folders
 *   description: Operaciones sobre carpetas
 */

/**
 * @swagger
 * /folders/stats:
 *   get:
 *     summary: Obtener estadísticas de carpetas del usuario
 *     tags: [Folders]
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas correctamente
 */
router.get('/stats', folderController.handleGetFolderStats);

/**
 * @swagger
 * /folders:
 *   post:
 *     summary: Crear una nueva carpeta
 *     tags: [Folders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nueva Carpeta
 *               parentId:
 *                 type: string
 *                 example: 60f7c2e8b4d1c2a5d8e4b123
 *     responses:
 *       201:
 *         description: Carpeta creada correctamente
 */
router.post('/', folderController.handleCreateFolder);

/**
 * @swagger
 * /folders:
 *   get:
 *     summary: Listar contenido de carpetas del usuario
 *     tags: [Folders]
 *     responses:
 *       200:
 *         description: Lista de carpetas y archivos
 */
router.get('/', folderController.handleListContent);

/**
 * @swagger
 * /folders/{folderId}:
 *   get:
 *     summary: Obtener detalles de una carpeta
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la carpeta
 *     responses:
 *       200:
 *         description: Detalles de la carpeta
 */
router.get('/:folderId', folderController.handleGetFolderDetails);

/**
 * @swagger
 * /folders/{folderId}:
 *   delete:
 *     summary: Eliminar una carpeta
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la carpeta
 *     responses:
 *       200:
 *         description: Carpeta eliminada correctamente
 */
router.delete('/:folderId', folderController.handleDeleteFolder);

/**
 * @swagger
 * /folders/{folderId}/move:
 *   patch:
 *     summary: Mover una carpeta a otra ubicación
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la carpeta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetParentId:
 *                 type: string
 *                 example: 60f7c2e8b4d1c2a5d8e4b456
 *     responses:
 *       200:
 *         description: Carpeta movida correctamente
 */
router.patch('/:folderId/move', folderController.moveUserFolder);

/**
 * @swagger
 * /folders/by-ids:
 *   post:
 *     summary: Obtener carpetas por IDs
 *     tags: [Folders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["id1", "id2"]
 *     responses:
 *       200:
 *         description: Carpetas obtenidas correctamente
 */
router.post('/by-ids', folderController.getFoldersByIds);

/**
 * @swagger
 * /folders/{folderId}/name:
 *   patch:
 *     summary: Actualizar el nombre de una carpeta
 *     tags: [Folders]
 *     parameters:
 *       - in: path
 *         name: folderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la carpeta
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
router.patch('/:folderId/name', folderController.updateFolderName);

export default router;