import Folder from '../models/Folder.model.js';
import Document from '../models/Document.model.js';

// --- Crear Carpeta ---
export const createFolder = async (folderData, userId) => {
  const { name, parentId = null } = folderData; // parentId es opcional, por defecto null (raíz)

  // Validación básica (puedes añadir más)
  if (!name) {
    throw new Error('El nombre de la carpeta es obligatorio.');
  }

  // Opcional: Verificar si ya existe una carpeta con el mismo nombre en el mismo nivel y dueño
  const existingFolder = await Folder.findOne({
    name,
    parentId: parentId ? parentId : null, // Asegura comparar null correctamente
    ownerId: userId,
  });

  if (existingFolder) {
    throw new Error(`Ya existe una carpeta llamada "${name}" en esta ubicación.`);
  }

  // Opcional: Si se proporciona parentId, verificar que la carpeta padre exista y pertenezca al usuario
  if (parentId) {
    const parent = await Folder.findOne({ _id: parentId, ownerId: userId });
    if (!parent) {
      throw new Error('La carpeta padre especificada no existe o no te pertenece.');
    }
  }

  // Crear la nueva carpeta
  const newFolder = new Folder({
    name,
    ownerId: userId,
    parentId: parentId ? parentId : null, // Guardar null explícitamente si no hay padre
  });

  await newFolder.save();
  return newFolder;
};

// --- Listar Contenido de Carpeta ---
export const listFolderContent = async (parentId = null, userId) => {
  // Buscar subcarpetas
  const folders = await Folder.find({
    ownerId: userId,
    parentId: parentId ? parentId : null, // Asegura buscar null correctamente
  }).sort({ name: 1 }); // Ordenar alfabéticamente

  // Buscar documentos (¡Cuando exista el modelo Document!)
  // const documents = await Document.find({
  //   ownerId: userId,
  //   folderId: parentId ? parentId : null, // Asumiendo que Document tiene folderId
  // }).sort({ name: 1 });

  // Combinar resultados (por ahora solo carpetas)
  return {
    folders: folders,
    documents: [], // Placeholder para documentos
    // documents: documents, // Cuando tengas documentos
  };
};

// --- Eliminar Carpeta ---
export const deleteFolder = async (folderId, userId) => {
  // 1. Encontrar la carpeta y verificar propiedad
  const folderToDelete = await Folder.findOne({ _id: folderId, ownerId: userId });

  if (!folderToDelete) {
    throw new Error('Carpeta no encontrada o no tienes permiso para eliminarla.');
  }

  // 2. Verificar si la carpeta está vacía (comprobar subcarpetas y documentos)
  const subFoldersCount = await Folder.countDocuments({ parentId: folderId, ownerId: userId });
  // const documentsCount = await Document.countDocuments({ folderId: folderId, ownerId: userId }); // Cuando exista

  // if (subFoldersCount > 0 || documentsCount > 0) {
  if (subFoldersCount > 0) { // Por ahora solo comprueba subcarpetas
     throw new Error('No se puede eliminar la carpeta porque no está vacía.');
  }

  // 3. Eliminar la carpeta (usando deleteOne para Mongoose >= 5)
  const result = await Folder.deleteOne({ _id: folderId, ownerId: userId });

  if (result.deletedCount === 0) {
      // Esto no debería pasar si findOne tuvo éxito, pero es una doble comprobación
      throw new Error('Error al eliminar la carpeta.');
  }

  // Puedes devolver un mensaje de éxito o algún identificador
  return { message: 'Carpeta eliminada con éxito.' };
};

export const getFolderById = async (folderId, userId) => {
  const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
  return folder; // Devuelve la carpeta o null si no se encuentra/no pertenece
};

export const moveFolder = async (userId, folderIdToMove, destinationParentId) => {
    const folderToMove = await Folder.findOne({ _id: folderIdToMove, ownerId: userId });
    if (!folderToMove) {
        const err = new Error('Folder to move not found or access denied');
        err.statusCode = 404;
        throw err;
    }

    // Validar que no se mueva a sí misma (si destinationParentId es la misma carpeta)
    if (folderIdToMove === destinationParentId) {
        const err = new Error('Cannot move a folder into itself.');
        err.statusCode = 400;
        throw err;
    }

    // Validar que la carpeta destino exista y pertenezca al usuario (si no es la raíz)
    if (destinationParentId) {
        const destinationFolder = await Folder.findOne({ _id: destinationParentId, ownerId: userId });
        if (!destinationFolder) {
            const err = new Error('Destination folder not found or access denied');
            err.statusCode = 404;
            throw err;
        }
        // IMPORTANTE: Evitar mover una carpeta a una de sus propias subcarpetas (ciclo)
        // Esta es una validación más compleja. Necesitarías recorrer los ancestros de destinationParentId
        // para asegurarte de que folderIdToMove no está entre ellos.
        // Por simplicidad, la omitimos aquí, pero es CRUCIAL en un sistema real.
        // Si folderIdToMove es un ancestro de destinationParentId, lanzar error.
    }

    folderToMove.parentId = destinationParentId; // null para mover a la raíz
    await folderToMove.save();
    console.log(`Folder ${folderIdToMove} moved to parent ${destinationParentId} by user ${userId}`);
    return folderToMove;
}

/**
 * Obtiene estadísticas de carpetas del usuario
 * @param {string} userId ID del usuario
 * @param {string|undefined} folderId ID de la carpeta específica o undefined para stats globales
 * @returns {Promise<Object>} Estadísticas de carpetas
 */
export const getFolderStats = async (userId, folderId) => {
    try {
        // Para una carpeta específica
        if (folderId && folderId !== 'null') {
            const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
            
            if (!folder) {
                throw new Error("Folder not found or access denied");
            }
            
            // Contar subcarpetas
            const folderCount = await Folder.countDocuments({ 
                ownerId: userId, 
                parentId: folderId 
            });
            
            // Contar archivos
            const fileCount = await Document.countDocuments({ 
                ownerId: userId, 
                folderId: folderId 
            });
            
            return { folderCount, fileCount };
        } 
        // Stats globales
        else {
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

/**
 * Obtiene múltiples carpetas por sus IDs
 * @param {string} userId - ID del usuario
 * @param {Array<string>} folderIds - Array de IDs de carpetas
 * @returns {Promise<Array>} - Array de carpetas
 */
export const getFoldersByIds = async (userId, folderIds) => {
  try {
    // Verificar que folderIds es un array válido
    if (!Array.isArray(folderIds) || folderIds.length === 0) {
      return [];
    }
    
    // Buscar solo las carpetas que pertenecen al usuario y están en la lista
    const folders = await Folder.find({
      _id: { $in: folderIds },
      ownerId: userId
    });
    
    // console.log(`Retrieved ${folders.length} folders by IDs for user ${userId}`);
    return folders;
  } catch (error) {
    console.error("Error getting folders by IDs:", error);
    throw new Error("Could not retrieve folders by IDs");
  }
};

/**
 * Actualiza el nombre de una carpeta
 * @param {string} userId ID del usuario
 * @param {string} folderId ID de la carpeta
 * @param {string} newName Nuevo nombre de la carpeta
 * @returns {Promise<Folder>} Carpeta actualizada
 */
export const updateFolderName = async (userId, folderId, newName) => {
  try {
    // Verificar que la carpeta existe y pertenece al usuario
    const folder = await Folder.findOne({ _id: folderId, ownerId: userId });
    if (!folder) {
      const err = new Error('Folder not found or access denied');
      err.statusCode = 404;
      throw err;
    }

    // Validar el nuevo nombre
    if (!newName || !newName.trim()) {
      const err = new Error('Folder name is required');
      err.statusCode = 400;
      throw err;
    }

    // Verificar que no existe otra carpeta con el mismo nombre en el mismo nivel
    const existingFolder = await Folder.findOne({
      ownerId: userId,
      parentId: folder.parentId,
      name: newName.trim(),
      _id: { $ne: folderId } // Excluir la carpeta actual
    });

    if (existingFolder) {
      const err = new Error('A folder with this name already exists in this location');
      err.statusCode = 409; // Conflict
      throw err;
    }

    // Actualizar el nombre
    folder.name = newName.trim();
    folder.updatedAt = new Date();
    await folder.save();

    console.log(`Folder ${folderId} name updated to "${newName}" by user ${userId}`);
    return folder;
  } catch (error) {
    if (error.statusCode) {
      throw error; // Re-lanzar errores con statusCode
    }
    console.error("Error updating folder name:", error);
    throw new Error("Could not update folder name");
  }
};