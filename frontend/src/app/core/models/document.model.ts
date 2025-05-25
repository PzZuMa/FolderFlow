export interface Document {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  ownerId: string;
  folderId: string | null;
  s3Key?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  isFavorite?: boolean;
}