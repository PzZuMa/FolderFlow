import { S3Client } from "@aws-sdk/client-s3";
import 'dotenv/config'; // Carga las variables de entorno al inicio

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const region_name = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;
console.log(`🔧 Intentando configurar cliente AWS S3 para la región: ${region_name || 'NO ESPECIFICADA'} y el bucket: ${bucketName || 'NO ESPECIFICADO'}`);
const presignedUrlExpiration = parseInt(process.env.PRESIGNED_URL_EXPIRATION || '3600', 10); // Default 1 hora

// Exportación nombrada
export {
    s3Client,
    bucketName,
    presignedUrlExpiration,
};