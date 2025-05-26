/**
 * Modelo que representa el estado de la subida de un archivo.
 * Permite hacer seguimiento del progreso, estado actual y posibles errores durante la subida.
 */
export interface UploadStatus {
  file: File; // Archivo que se está subiendo
  s3Key?: string; // Clave del archivo en S3, si ya está disponible
  progress: number; // Progreso de la subida (0-100)
  status: 'pending' | 'uploading' | 'confirming' | 'success' | 'error'; // Estado actual de la subida
  error?: string; // Mensaje de error en caso de fallo
}