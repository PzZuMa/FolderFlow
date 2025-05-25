export interface Folder {
  _id: string;
  name: string;
  ownerId: string;
  parentId: string | null;
  createdAt?: string;
  updatedAt?: string;
}