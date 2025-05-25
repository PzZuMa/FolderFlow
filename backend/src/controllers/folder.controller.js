import * as folderService from '../services/folder.service.js';

export const handleCreateFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const folderData = req.body;
    const newFolder = await folderService.createFolder(folderData, userId);
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    res
      .status(
        error.message.includes('obligatorio') ||
        error.message.includes('existe') ||
        error.message.includes('pertenece')
          ? 400
          : 500
      )
      .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const handleListContent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const parentId =
      req.query.parentId === 'null' ? null : req.query.parentId || null;
    const content = await folderService.listFolderContent(parentId, userId);
    res
      .status(200)
      .json(Array.isArray(content?.folders) ? content.folders : []);
  } catch (error) {
    console.error('Error listing folder content:', error);
    if (next) {
      next(error);
    } else {
      res
        .status(500)
        .json({ message: error.message || 'Error interno del servidor' });
    }
  }
};

export const handleDeleteFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const result = await folderService.deleteFolder(folderId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting folder:', error);
    res
      .status(
        error.message.includes('encontrada')
          ? 404
          : error.message.includes('vacía')
          ? 400
          : 500
      )
      .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const handleGetFolderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const folder = await folderService.getFolderById(folderId, userId);
    if (!folder) {
      return res
        .status(404)
        .json({ message: 'Carpeta no encontrada o no te pertenece.' });
    }
    res.status(200).json(folder);
  } catch (error) {
    console.error('Error fetching folder details:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const moveUserFolder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { destinationParentId } = req.body;
    if (destinationParentId === undefined) {
      return res
        .status(400)
        .json({ message: 'destinationParentId is required (can be null for root).' });
    }
    const movedFolder = await folderService.moveFolder(
      userId,
      folderId,
      destinationParentId
    );
    res.status(200).json(movedFolder);
  } catch (error) {
    next(error);
  }
};

export const handleGetFolderStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const folderId = req.query.folderId;
    const stats = await folderService.getFolderStats(userId, folderId);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting folder stats:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const getFoldersByIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderIds } = req.body;
    if (!folderIds || !Array.isArray(folderIds)) {
      return res
        .status(400)
        .json({ message: 'Se requiere un array de folderIds' });
    }
    const folders = await folderService.getFoldersByIds(userId, folderIds);
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders by IDs:', error);
    res
      .status(500)
      .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const updateFolderName = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }
    const updatedFolder = await folderService.updateFolderName(
      userId,
      folderId,
      name
    );
    res.status(200).json(updatedFolder);
  } catch (error) {
    next(error);
  }
};