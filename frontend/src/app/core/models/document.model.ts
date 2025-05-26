/**
 * Modelo que representa un documento/archivo en la aplicación.
 * Incluye metadatos, ubicación, propietario y estado de favorito.
 */
export interface Document {
  _id: string;           // Identificador único del documento
  name: string;          // Nombre del archivo
  size: number;          // Tamaño en bytes
  mimeType: string;      // Tipo MIME del archivo
  ownerId: string;       // ID del usuario propietario
  folderId: string | null; // ID de la carpeta contenedora (null si está en raíz)
  s3Key?: string;        // Clave del archivo en S3 (opcional)
  url?: string;          // URL de acceso al archivo (opcional)
  createdAt?: string;    // Fecha de creación (opcional)
  updatedAt?: string;    // Fecha de última actualización (opcional)
  isFavorite?: boolean;  // Indica si el documento está marcado como favorito (opcional)
}