import * as documentService from '../services/document.service.js'; // Importar todo como un objeto

// POST /api/documents/upload-url
async function getUploadUrl(req, res, next) {
    try {
        const { filename, mimeType, folderId } = req.body;
        const userId = req.user.id; // Asumiendo que authMiddleware añade req.user

        if (!filename || !mimeType) {
            return res.status(400).json({ message: 'Filename and mimeType are required' });
        }

        const result = await documentService.generateUploadUrl(userId, filename, mimeType, folderId);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

// POST /api/documents/confirm-upload
async function confirmUpload(req, res, next) {
    try {
        const { s3Key, name, mimeType, size, folderId } = req.body;
        const userId = req.user.id;

        const newDocument = await documentService.confirmUploadAndSaveMetadata(
            userId, s3Key, name, mimeType, size, folderId
        );
        res.status(201).json(newDocument);
    } catch (error) {
        next(error);
    }
}

// GET /api/documents?folderId=...
async function listUserDocuments(req, res, next) {
    try {
        const userId = req.user.id;
        const folderId = req.query.folderId || null;

        // --- Combinar con Carpetas (pendiente) ---
        const documents = await documentService.listDocuments(userId, folderId);
        // const folders = await folderService.listFolders(userId, folderId); // Necesitarás importar y llamar a folderService
        // const combinedResults = { folders, documents };
        // res.status(200).json(combinedResults);

        res.status(200).json(documents); // De momento, solo documentos

    } catch (error) {
        next(error);
    }
}

// GET /api/documents/:documentId/download-url
async function getDownloadUrl(req, res, next) {
    try {
        const userId = req.user.id;
        const { documentId } = req.params;

        const signedUrl = await documentService.generateDownloadUrl(userId, documentId);
        res.status(200).json({ downloadUrl: signedUrl });
    } catch (error) {
        if (error.message.includes('Document not found')) {
             return res.status(404).json({ message: error.message });
        }
        next(error);
    }
}

// DELETE /api/documents/:documentId
async function deleteUserDocument(req, res, next) {
    try {
        const userId = req.user.id;
        const { documentId } = req.params;

        const result = await documentService.deleteDocument(userId, documentId);
        res.status(200).json(result);
    } catch (error) {
       if (error.message.includes('Document not found')) {
             return res.status(404).json({ message: error.message });
        }
        next(error);
    }
}

async function getAllUserDocuments(req, res, next) {
    try {
        const userId = req.user.id;
        const documents = await documentService.listAllUserDocuments(userId);
        res.status(200).json(documents);
    } catch (error) {
        next(error);
    }
}

async function moveUserDocument(req, res, next) {
    try {
        const userId = req.user.id;
        const { documentId } = req.params; // ID del documento a mover
        const { destinationFolderId } = req.body; // ID de la carpeta destino (puede ser null)

        if (destinationFolderId === undefined) {
             return res.status(400).json({ message: 'destinationFolderId is required (can be null for root).' });
        }

        const movedDocument = await documentService.moveDocument(userId, documentId, destinationFolderId);
        res.status(200).json(movedDocument);
    } catch (error) {
        next(error);
    }
}

/**
 * Obtiene los documentos recientes del usuario.
 */
async function getRecentDocs(req, res, next) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit || '5', 10);
        
        const recentDocs = await documentService.getRecentDocuments(userId, limit);
        res.status(200).json(recentDocs);
    } catch (error) {
        next(error);
    }
}

/**
 * Obtiene los documentos favoritos del usuario.
 */
async function getFavoriteDocs(req, res, next) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit || '5', 10);
        
        const favoriteDocs = await documentService.getFavoriteDocuments(userId, limit);
        res.status(200).json(favoriteDocs);
    } catch (error) {
        next(error);
    }
}

/**
 * Obtiene estadísticas de documentos del usuario.
 */
async function getDocStats(req, res, next) {
    try {
        const userId = req.user.id;
        
        const stats = await documentService.getDocumentStats(userId);
        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
}

/**
 * Marca/desmarca un documento como favorito.
 */
async function toggleFavorite(req, res, next) {
    try {
        const userId = req.user.id;
        const { documentId } = req.params;
        const { isFavorite } = req.body;
        
        // Usar el servicio en lugar de acceder directamente al modelo
        const document = await documentService.toggleDocumentFavorite(userId, documentId, isFavorite);
        
        if (!document) {
            return res.status(404).json({ message: 'Document not found or access denied' });
        }
        
        res.status(200).json(document);
    } catch (error) {
        next(error);
    }
}

// Exportación nombrada de todas las funciones del controlador
export {
    getUploadUrl,
    confirmUpload,
    listUserDocuments,
    getDownloadUrl,
    deleteUserDocument,
    getAllUserDocuments,
    moveUserDocument,
    getRecentDocs,
    getFavoriteDocs,
    getDocStats,
    toggleFavorite,
};