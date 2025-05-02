export interface Folder {
    _id: string;
    name: string;
    ownerId: string;
    parentId: string | null;
    createdAt?: string; // O Date si lo transformas
    updatedAt?: string; // O Date
  }