export interface UploadStatus {
    file: File;
    s3Key?: string;
    progress: number; // 0-100
    status: 'pending' | 'uploading' | 'confirming' | 'success' | 'error';
    error?: string;
}