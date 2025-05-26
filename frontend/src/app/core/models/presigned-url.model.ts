/**
 * Respuesta de la API para obtener una URL prefirmada de subida a S3.
 */
export interface PresignedUrlResponse {
  signedUrl: string; // URL prefirmada para subir el archivo a S3
  s3Key: string;     // Clave generada para el archivo en S3
}

/**
 * Respuesta de la API para obtener una URL prefirmada de descarga desde S3.
 */
export interface PresignedDownloadUrlResponse {
  downloadUrl: string; // URL prefirmada para descargar el archivo desde S3
}