export interface PresignedUrlResponse {
    signedUrl: string;
    s3Key: string; // Para subida
  }
  
  export interface PresignedDownloadUrlResponse {
      downloadUrl: string; // Para descarga
  }