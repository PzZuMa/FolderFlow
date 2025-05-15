import Folder from '../models/Folder.model.js';
// Importaremos el modelo Document cuando exista para la comprobación de carpeta vacía
// import Document from '../models/Document.model.js';

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
 * Obtiene estadísticas de carpetas del usuario.
 * @param {string} userId ID del usuario
 * @returns {Promise<Object>} Estadísticas de carpetas
 */
export const getFolderStats = async (userId) => {
    try {
        // Asegurarse de que userId es válido
        console.log("Getting folder stats for user:", userId);
        
        // Contar total de carpetas del usuario
        const totalCount = await Folder.countDocuments({ ownerId: userId });
        console.log(`Found ${totalCount} folders for user ${userId}`);
        
        // Carpetas raíz
        const rootFolders = await Folder.find({ ownerId: userId, parentId: null });
        
        return { 
            totalCount,
            rootFolderCount: rootFolders.length
        };
    } catch (error) {
        console.error("Error getting folder statistics:", error);
        throw new Error("Could not retrieve folder statistics");
    }
};