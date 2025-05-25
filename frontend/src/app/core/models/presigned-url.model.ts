export interface PresignedUrlResponse {
  signedUrl: string;
  s3Key: string;
}

export interface PresignedDownloadUrlResponse {
  downloadUrl: string;
}