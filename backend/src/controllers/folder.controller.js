import * as folderService from '../services/folder.service.js';

// --- Crear Carpeta ---
export const handleCreateFolder = async (req, res) => {
  try {
    // El ID del usuario viene del middleware 'protect'
    const userId = req.user.id;
    const folderData = req.body; // { name, parentId? }

    const newFolder = await folderService.createFolder(folderData, userId);
    res.status(201).json(newFolder);
  } catch (error) {
    console.error('Error creating folder:', error);
    // Devolver 400 para errores de validación/negocio, 500 para otros
    res.status(error.message.includes('obligatorio') || error.message.includes('existe') || error.message.includes('pertenece') ? 400 : 500)
       .json({ message: error.message || 'Error interno del servidor' });
  }
};

// --- Listar Contenido ---
export const handleListContent = async (req, res, next) => { // Añade 'next' si usas manejo de errores global
  try {
    const userId = req.user.id;
    const parentId = req.query.parentId === 'null' ? null : (req.query.parentId || null); // Manejo más robusto

    const content = await folderService.listFolderContent(parentId, userId);

    // --- CAMBIO AQUÍ ---
    // Asumiendo que 'content' es el objeto { folders: [...] }
    // Enviamos SOLAMENTE el array que está dentro de la propiedad 'folders'
    // Si no existe 'folders' o no es un array, envía array vacío para seguridad.
    res.status(200).json(Array.isArray(content?.folders) ? content.folders : []);
    // --- FIN CAMBIO ---

  } catch (error) {
    console.error('Error listing folder content:', error);
    // Pasa el error al manejador global si lo tienes
    if (next) {
         next(error);
    } else {
        res.status(500).json({ message: error.message || 'Error interno del servidor' });
    }
  }
};


// --- Eliminar Carpeta ---
export const handleDeleteFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params; // Obtener folderId de la URL (:folderId)

    // Validar folderId (opcional)
    // if (!mongoose.Types.ObjectId.isValid(folderId)) {
    //    return res.status(400).json({ message: 'El ID de la carpeta no es válido.' });
    // }

    const result = await folderService.deleteFolder(folderId, userId);
    res.status(200).json(result); // O status 204 (No Content) si no devuelves cuerpo
  } catch (error) {
    console.error('Error deleting folder:', error);
    // Devolver 404 si no se encontró, 400 si no está vacía, 500 para otros
     res.status(error.message.includes('encontrada') ? 404 : error.message.includes('vacía') ? 400 : 500)
       .json({ message: error.message || 'Error interno del servidor' });
  }
};

export const handleGetFolderDetails = async (req, res) => {
  try {
    const userId = req.user.id; // Del middleware protect
    const { folderId } = req.params;
    const folder = await folderService.getFolderById(folderId, userId); // Necesitarás este servicio
    if (!folder) {
      return res.status(404).json({ message: 'Carpeta no encontrada o no te pertenece.' });
    }
    res.status(200).json(folder);
  } catch (error) {
    console.error('Error fetching folder details:', error);
    res.status(500).json({ message: error.message || 'Error interno del servidor' });
  }
};

export const moveUserFolder = async(req, res, next) => {
    try {
        const userId = req.user.id;
        const { folderId } = req.params; // ID de la carpeta a mover
        const { destinationParentId } = req.body; // ID de la carpeta padre destino (puede ser null)

        // Validación básica del input
        if (destinationParentId === undefined) { // Permitir null, pero no undefined
            return res.status(400).json({ message: 'destinationParentId is required (can be null for root).' });
        }

        const movedFolder = await folderService.moveFolder(userId, folderId, destinationParentId);
        res.status(200).json(movedFolder);
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene estadísticas de carpetas
 */
export const handleGetFolderStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const folderId = req.query.folderId; // undefined, 'null', or a valid ID
        
        const stats = await folderService.getFolderStats(userId, folderId);
        
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting folder stats:', error);
        res.status(500).json({ message: error.message || 'Error interno del servidor' });
    }
};

/**
 * Obtiene carpetas por una lista de IDs
 */
export const getFoldersByIds = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderIds } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds)) {
      return res.status(400).json({ message: 'Se requiere un array de folderIds' });
    }
    
    const folders = await folderService.getFoldersByIds(userId, folderIds);
    res.status(200).json(folders);
  } catch (error) {
    console.error('Error fetching folders by IDs:', error);
    res.status(500).json({ message: error.message || 'Error interno del servidor' });
  }
};

/**
 * Actualiza el nombre de una carpeta
 */
export const updateFolderName = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folderId } = req.params;
    const { name } = req.body;

    // Validación básica
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const updatedFolder = await folderService.updateFolderName(userId, folderId, name);
    res.status(200).json(updatedFolder);
  } catch (error) {
    next(error);
  }
};