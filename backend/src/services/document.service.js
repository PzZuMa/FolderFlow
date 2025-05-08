import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import Document from '../models/Document.model.js'; // Importación default
import Folder from '../models/Folder.model.js';     // Importación default (asumida)
import { s3Client, bucketName, presignedUrlExpiration } from '../config/aws.js'; // Importación nombrada

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

// Exportar funciones individualmente (exportación nombrada)
export {
    generateUploadUrl,
    confirmUploadAndSaveMetadata,
    listDocuments,
    generateDownloadUrl,
    deleteDocument,
};