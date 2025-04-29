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
export const handleListContent = async (req, res) => {
  try {
    const userId = req.user.id;
    // Obtener parentId de los query params (/?parentId=...) o usar null si no se provee
    const parentId = req.query.parentId || null;

    // Validar que parentId, si existe, sea un ObjectId válido (opcional pero recomendado)
    // const mongoose = require('mongoose'); // Importar mongoose si no está global
    // if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
    //    return res.status(400).json({ message: 'El ID de la carpeta padre no es válido.' });
    // }


    const content = await folderService.listFolderContent(parentId === 'null' ? null : parentId, userId); // Convertir 'null' string a null
    res.status(200).json(content);
  } catch (error) {
    console.error('Error listing folder content:', error);
    res.status(500).json({ message: error.message || 'Error interno del servidor' });
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