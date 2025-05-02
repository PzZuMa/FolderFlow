export interface Document {
    _id: string;
    name: string;
    s3Key: string;
    mimeType: string;
    size: number;
    ownerId: string;
    folderId: string | null;
    createdAt?: string; // O Date
    updatedAt?: string; // O Date
  }