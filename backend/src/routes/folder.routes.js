import express from 'express';
import * as folderController from '../controllers/folder.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/stats', folderController.handleGetFolderStats);
router.post('/', folderController.handleCreateFolder);
router.get('/', folderController.handleListContent);
router.get('/:folderId', folderController.handleGetFolderDetails);
router.delete('/:folderId', folderController.handleDeleteFolder);
router.patch('/:folderId/move', folderController.moveUserFolder);
router.post('/by-ids', folderController.getFoldersByIds);
router.patch('/:folderId/name', folderController.updateFolderName);

export default router;