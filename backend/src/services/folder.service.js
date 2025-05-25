import Folder from '../models/Folder.model.js';
import Document from '../models/Document.model.js';

export const createFolder = async (folderData, userId) => {
  const { name, parentId = null } = folderData;

  if (!name) {
    throw new Error('El nombre de la carpeta es obligatorio.');
  }

  const existingFolder = await Folder.findOne({
    name,
    parentId: parentId ? parentId : null,
    ownerId: userId,
  });

  if (existingFolder) {
    throw new Error(`Ya existe una carpeta llamada "${name}" en esta ubicación.`);
  }

  if (parentId) {
    const parent = await Folder.findOne({ _id: parentId, ownerId: userId });
    if (!parent) {
      throw new Error('La carpeta padre especificada no existe o no te pertenece.');
    }
  }

  const newFolder = new Folder({
    name,
    ownerId: userId,
    parentId: parentId ? parentId : null,
  });

  await newFolder.save();
  return newFolder;
};

export const listFolderContent = async (parentId = null, userId) => {
  const folders = await Folder.find({
    ownerId: userId,
    parentId: parentId ? parentId : null,
  }).sort({ name: 1 });

  return {
    folders: folders,
    documents: [],
  };
};

export const deleteFolder = async (folderId, userId) => {
  const folderToDelete = await Folder.findOne({ _id: folderId, ownerId: userId });

  if (!folderToDelete) {
    throw new Error('Carpeta no encontrada o no tienes permiso para eliminarla.');
  }

  const subFoldersCount = await Folder.countDocuments({ parentId: folderId, ownerId: userId });

  if (subFoldersCount > 0) {
    throw new Error('No se puede eliminar la carpeta porque no está vacía.');
  }

  const result = await Folder.deleteOne({ _id: folderId, ownerId: userId });

  if (result.deletedCount === 0) {
    throw new Error('Error al eliminar la carpeta.');
  }

  return { message: 'Carpeta eliminada con éxito.' };
};

export const getFolderById = async (folderId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
  return folder;
};

export const moveFolder = async (userId, folderIdToMove, destinationParentId) => {
  const folderToMove = await Folder.findOne({ _id: folderIdToMove, ownerId: userId });
  if (!folderToMove) {
    const err = new Error('Folder to move not found or access denied');
    err.statusCode = 404;
    throw err;
  }

  if (folderIdToMove === destinationParentId) {
    const err = new Error('Cannot move a folder into itself.');
    err.statusCode = 400;
    throw err;
  }

  if (destinationParentId) {
    const destinationFolder = await Folder.findOne({ _id: destinationParentId, ownerId: userId });
    if (!destinationFolder) {
      const err = new Error('Destination folder not found or access denied');
      err.statusCode = 404;
      throw err;
    }
  }

  folderToMove.parentId = destinationParentId;
  await folderToMove.save();
  console.log(`Folder ${folderIdToMove} moved to parent ${destinationParentId} by user ${userId}`);
  return folderToMove;
};

export const getFolderStats = async (userId, folderId) => {
  try {
    if (folderId && folderId !== 'null') {
      const folder = await Folder.findOne({ _id: folderId, ownerId: userId });

      if (!folder) {
        throw new Error("Folder not found or access denied");
      }

      const folderCount = await Folder.countDocuments({
        ownerId: userId,
        parentId: folderId
      });

      const fileCount = await Document.countDocuments({
        ownerId: userId,
        folderId: folderId
      });

      return { folderCount, fileCount };
    } else {
      const totalCount = await Folder.countDocuments({ ownerId: userId });
      const rootFolderCount = await Folder.countDocuments({ ownerId: userId, parentId: null });
      const totalDocumentCount = await Document.countDocuments({ ownerId: userId });

      return {
        totalCount,
        rootFolderCount,
        totalDocumentCount
      };
    }
  } catch (error) {
    console.error("Error getting folder statistics:", error);
    throw new Error("Could not retrieve folder statistics");
  }
};

export const getFoldersByIds = async (userId, folderIds) => {
  try {
    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return [];
    }

    const folders = await Folder.find({
      _id: { $in: folderIds },
      ownerId: userId
    });

    return folders;
  } catch (error) {
    console.error("Error getting folders by IDs:", error);
    throw new Error("Could not retrieve folders by IDs");
  }
};

export const updateFolderName = async (userId, folderId, newName) => {
  try {
    const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
    if (!folder) {
      const err = new Error('Folder not found or access denied');
      err.statusCode = 404;
      throw err;
    }

    if (!newName || !newName.trim()) {
      const err = new Error('Folder name is required');
      err.statusCode = 400;
      throw err;
    }

    const existingFolder = await Folder.findOne({
      ownerId: userId,
      parentId: folder.parentId,
      name: newName.trim(),
      _id: { $ne: folderId }
    });

    if (existingFolder) {
      const err = new Error('A folder with this name already exists in this location');
      err.statusCode = 409;
      throw err;
    }

    folder.name = newName.trim();
    folder.updatedAt = new Date();
    await folder.save();

    console.log(`Folder ${folderId} name updated to "${newName}" by user ${userId}`);
    return folder;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating folder name:", error);
    throw new Error("Could not update folder name");
  }
};