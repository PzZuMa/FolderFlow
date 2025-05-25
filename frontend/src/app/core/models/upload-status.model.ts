export interface UploadStatus {
  file: File;
  s3Key?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'confirming' | 'success' | 'error';
  error?: string;
}