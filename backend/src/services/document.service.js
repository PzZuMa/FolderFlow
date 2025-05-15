import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import Document from '../models/Document.model.js'; // Importación default
import Folder from '../models/Folder.model.js';     // Importación default (asumida)
import { s3Client, bucketName, presignedUrlExpiration } from '../config/aws.js'; // Importación nombrada
import mongoose from 'mongoose';


/**
 * Genera una URL prefirmada para subir un archivo a S3.
 */
async function generateUploadUrl(userId, filename, mimeType, folderId = null) {
    if (folderId) {
        const parentFolder = await Folder.findOne({ _id: folderId, ownerId: userId });
        if (!parentFolder) {
            throw new Error('Parent folder not found or access denied');
        }
    }

    const uniqueSuffix = `${uuidv4()}-${filename}`;
    const s3Key = folderId
        ? `${userId}/${folderId}/${uniqueSuffix}`
        : `${userId}/root/${uniqueSuffix}`;


    const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ContentType: mimeType,
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, putCommand, {
            expiresIn: presignedUrlExpiration,
        });
        return { signedUrl, s3Key };
    } catch (error) {
        console.error("Error generating presigned URL for upload:", error);
        throw new Error("Could not generate upload URL");
    }
}

/**
 * Guarda los metadatos del documento en MongoDB después de una subida exitosa a S3.
 */
async function confirmUploadAndSaveMetadata(userId, s3Key, name, mimeType, size, folderId = null) {
    if (!s3Key || !name || !mimeType || !size) {
       throw new Error('Missing required metadata fields');
    }

    if (folderId) {
        const parentFolder = await Folder.findOne({ _id: folderId, ownerId: userId });
        if (!parentFolder) {
            throw new Error('Parent folder not found or access denied');
        }
    } else {
        folderId = null;
    }

    const newDocument = new Document({
        name,
        s3Key,
        mimeType,
        size,
        ownerId: userId,
        folderId: folderId,
    });

    try {
        await newDocument.save();
        return newDocument;
    } catch (error) {
        console.error("Error saving document metadata:", error);
        // Considerar rollback S3 aquí si es necesario
        throw new Error("Could not save document metadata");
    }
}

async function listAllUserDocuments(userId) {
    const query = { ownerId: userId }; // Solo filtra por dueño
    try {
        const documents = await Document.find(query).sort({ updatedAt: -1 }); // Ordenar por más reciente globalmente
        console.log(`BACKEND: listAllUserDocuments for user ${userId} found ${documents.length} documents.`);
        return documents;
    } catch (error) {
        console.error("Error listing all user documents:", error);
        throw new Error("Could not list all user documents");
    }
}

/**
 * Lista los documentos de un usuario, opcionalmente filtrados por carpeta.
 */
async function listDocuments(userId, folderId = null) {
    const query = { ownerId: userId, folderId: folderId ? folderId : null };
    try {
        const documents = await Document.find(query).sort({ name: 1 });
        return documents;
    } catch (error) {
        console.error("Error listing documents:", error);
        throw new Error("Could not list documents");
    }
}

/**
 * Genera una URL prefirmada para descargar un archivo de S3.
 */
async function generateDownloadUrl(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, ownerId: userId });
    if (!document) {
        throw new Error('Document not found or access denied');
    }

    const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: document.s3Key,
        ResponseContentDisposition: `attachment; filename="${document.name}"`
    });

    try {
        const signedUrl = await getSignedUrl(s3Client, getCommand, {
            expiresIn: presignedUrlExpiration,
        });
        return signedUrl;
    } catch (error) {
        console.error("Error generating presigned URL for download:", error);
        throw new Error("Could not generate download URL");
    }
}

/**
 * Elimina un documento (de S3 y MongoDB).
 */
async function deleteDocument(userId, documentId) {
    const document = await Document.findOne({ _id: documentId, ownerId: userId });
    if (!document) {
        throw new Error('Document not found or access denied');
    }

    const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: document.s3Key,
    });

    try {
        await s3Client.send(deleteCommand);
        console.log(`Successfully deleted object ${document.s3Key} from S3.`);
    } catch (error) {
        console.error(`Error deleting object ${document.s3Key} from S3:`, error);
        // Decide how to handle S3 delete failure
    }

    try {
        await Document.findByIdAndDelete(documentId);
        console.log(`Successfully deleted document metadata ${documentId} from MongoDB.`);
        return { message: 'Document deleted successfully' };
    } catch (error) {
        console.error(`Error deleting document metadata ${documentId} from MongoDB:`, error);
        throw new Error("Could not delete document metadata");
    }
}

async function moveDocument(userId, documentIdToMove, destinationFolderId) {
    const documentToMove = await Document.findOne({ _id: documentIdToMove, ownerId: userId });
    if (!documentToMove) {
        const err = new Error('Document to move not found or access denied');
        err.statusCode = 404;
        throw err;
    }

    // Validar que la carpeta destino exista y pertenezca al usuario (si no es la raíz)
    if (destinationFolderId) {
        const destinationFolder = await Folder.findOne({ _id: destinationFolderId, ownerId: userId });
        if (!destinationFolder) {
            const err = new Error('Destination folder not found or access denied');
            err.statusCode = 404;
            throw err;
        }
    }

    documentToMove.folderId = destinationFolderId; // null para mover a la raíz
    await documentToMove.save();
    console.log(`Document ${documentIdToMove} moved to folder ${destinationFolderId} by user ${userId}`);
    return documentToMove;
}

/**
 * Obtiene los documentos más recientes del usuario.
 * @param {string} userId ID del usuario
 * @param {number} limit Número de documentos a devolver
 * @returns {Promise<Array>} Documentos recientes
 */
async function getRecentDocuments(userId, limit = 5) {
    try {
        const documents = await Document.find({ ownerId: userId })
            .sort({ updatedAt: -1 })  // Ordenar por fecha de actualización descendente
            .limit(limit);            // Limitar cantidad de resultados
        
        console.log(`Retrieved ${documents.length} recent documents for user ${userId}`);
        return documents;
    } catch (error) {
        console.error("Error getting recent documents:", error);
        throw new Error("Could not retrieve recent documents");
    }
}

/**
 * Obtiene los documentos marcados como favoritos del usuario.
 * @param {string} userId ID del usuario
 * @param {number} limit Número de documentos a devolver
 * @returns {Promise<Array>} Documentos favoritos
 */
async function getFavoriteDocuments(userId, limit = 5) {
    try {
        // Suponiendo que el modelo Document tiene un campo isFavorite
        const documents = await Document.find({ 
            ownerId: userId,
            isFavorite: true 
        })
        .sort({ updatedAt: -1 })
        .limit(limit);
        
        console.log(`Retrieved ${documents.length} favorite documents for user ${userId}`);
        return documents;
    } catch (error) {
        console.error("Error getting favorite documents:", error);
        throw new Error("Could not retrieve favorite documents");
    }
}

/**
 * Obtiene estadísticas de documentos del usuario.
 * @param {string} userId ID del usuario
 * @returns {Promise<Object>} Estadísticas de documentos
 */
async function getDocumentStats(userId) {
    try {
        // Contar documentos
        const totalCount = await Document.countDocuments({ ownerId: userId });
        
        // CORRECCIÓN: Convertir userId a ObjectId para la agregación
        const ObjectId = mongoose.Types.ObjectId;
        let userObjId;
        
        try {
            userObjId = new ObjectId(userId);
        } catch (err) {
            console.error("Error converting userId to ObjectId:", err);
            userObjId = userId; // Fallback al valor original
        }
        
        // Calcular tamaño total con la conversión adecuada
        const result = await Document.aggregate([
            { $match: { ownerId: userObjId } },
            { $group: { _id: null, totalSize: { $sum: "$size" } } }
        ]);
        
        const totalSize = result.length > 0 ? result[0].totalSize : 0;
        
        return { totalCount, totalSize };
    } catch (error) {
        console.error("Error getting document statistics:", error);
        throw new Error("Could not retrieve document statistics");
    }
}

/**
 * Marca o desmarca un documento como favorito
 * @param {string} userId ID del usuario
 * @param {string} documentId ID del documento
 * @param {boolean} isFavorite Nuevo estado (true = favorito, false = no favorito)
 * @returns {Promise<Object>} Documento actualizado
 */
async function toggleDocumentFavorite(userId, documentId, isFavorite) {
    try {
        const document = await Document.findOneAndUpdate(
            { _id: documentId, ownerId: userId },
            { isFavorite: !!isFavorite },
            { new: true }
        );
        
        if (!document) {
            throw new Error('Document not found or access denied');
        }
        
        console.log(`Document ${documentId} favorite status set to ${isFavorite} by user ${userId}`);
        return document;
    } catch (error) {
        console.error("Error updating document favorite status:", error);
        throw error;
    }
}

// Exportar funciones individualmente (exportación nombrada)
export {
    generateUploadUrl,
    confirmUploadAndSaveMetadata,
    listDocuments,
    generateDownloadUrl,
    deleteDocument,
    listAllUserDocuments,
    moveDocument,
    getRecentDocuments,
    getFavoriteDocuments,
    getDocumentStats,
    toggleDocumentFavorite,
};