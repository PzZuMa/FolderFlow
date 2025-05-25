import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';
import Document from '../models/Document.model.js';
import Folder from '../models/Folder.model.js';
import { s3Client, bucketName, presignedUrlExpiration } from '../config/aws.js';
import mongoose from 'mongoose';

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
    throw new Error("Could not save document metadata");
  }
}

async function listAllUserDocuments(userId) {
  const query = { ownerId: userId };
  try {
    const documents = await Document.find(query).sort({ updatedAt: -1 });
    return documents;
  } catch (error) {
    console.error("Error listing all user documents:", error);
    throw new Error("Could not list all user documents");
  }
}

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

  if (destinationFolderId) {
    const destinationFolder = await Folder.findOne({ _id: destinationFolderId, ownerId: userId });
    if (!destinationFolder) {
      const err = new Error('Destination folder not found or access denied');
      err.statusCode = 404;
      throw err;
    }
  }

  documentToMove.folderId = destinationFolderId;
  await documentToMove.save();
  console.log(`Document ${documentIdToMove} moved to folder ${destinationFolderId} by user ${userId}`);
  return documentToMove;
}

async function getRecentDocuments(userId, limit = 5) {
  try {
    const documents = await Document.find({ ownerId: userId })
      .sort({ updatedAt: -1 })
      .limit(limit);
    return documents;
  } catch (error) {
    console.error("Error getting recent documents:", error);
    throw new Error("Could not retrieve recent documents");
  }
}

async function getFavoriteDocuments(userId, limit = 5) {
  try {
    const documents = await Document.find({
      ownerId: userId,
      isFavorite: true
    })
      .sort({ updatedAt: -1 })
      .limit(limit);
    return documents;
  } catch (error) {
    console.error("Error getting favorite documents:", error);
    throw new Error("Could not retrieve favorite documents");
  }
}

async function getDocumentStats(userId) {
  try {
    const totalCount = await Document.countDocuments({ ownerId: userId });

    const ObjectId = mongoose.Types.ObjectId;
    let userObjId;

    try {
      userObjId = new ObjectId(userId);
    } catch (err) {
      console.error("Error converting userId to ObjectId:", err);
      userObjId = userId;
    }

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

async function getDocumentById(userId, documentId) {
  try {
    const document = await Document.findOne({
      _id: documentId,
      ownerId: userId
    });

    if (!document) {
      throw new Error('Document not found or access denied');
    }

    return document;
  } catch (error) {
    console.error("Error getting document by ID:", error);
    throw error;
  }
}

async function updateDocumentName(userId, documentId, newName) {
  try {
    const document = await Document.findOne({ _id: documentId, ownerId: userId });
    if (!document) {
      const err = new Error('Document not found or access denied');
      err.statusCode = 404;
      throw err;
    }

    if (!newName || !newName.trim()) {
      const err = new Error('Document name is required');
      err.statusCode = 400;
      throw err;
    }

    const existingDocument = await Document.findOne({
      ownerId: userId,
      folderId: document.folderId,
      name: newName.trim(),
      _id: { $ne: documentId }
    });

    if (existingDocument) {
      const err = new Error('A document with this name already exists in this folder');
      err.statusCode = 409;
      throw err;
    }

    document.name = newName.trim();
    document.updatedAt = new Date();
    await document.save();

    console.log(`Document ${documentId} name updated to "${newName}" by user ${userId}`);
    return document;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    console.error("Error updating document name:", error);
    throw new Error("Could not update document name");
  }
}

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
  getDocumentById,
  updateDocumentName,
};