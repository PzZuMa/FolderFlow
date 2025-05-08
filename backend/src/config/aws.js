// src/config/aws.js
import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { defaultProvider as credentialDefaultProvider } from "@aws-sdk/credential-provider-node";
import 'dotenv/config';

const region = process.env.AWS_REGION;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

console.log('DEBUG: Leyendo S3_BUCKET_NAME de .env:', bucketName);

if (!region || !bucketName) {
    console.warn('⚠️ Advertencia: Faltan variables de entorno esenciales para AWS (AWS_REGION, S3_BUCKET_NAME).');
}

// Configuración simplificada del cliente S3
const s3Client = new S3Client({
    region: region,
    // Usar el proveedor de credenciales por defecto
    credentials: credentialDefaultProvider(),
    // Especificar el manejador HTTP de Node
    requestHandler: new NodeHttpHandler({
        // Aumentar timeouts para subidas grandes
        connectionTimeout: 5000, // 5 segundos para establecer conexión
        socketTimeout: 300000    // 5 minutos para operaciones de subida
    }),
    // Mantener solo lo necesario para que funcione
    forcePathStyle: true, // Usar path style para mayor compatibilidad
});

console.log(`🔧 Cliente AWS S3 configurado para la región: ${region || 'NO ESPECIFICADA'} y el bucket: ${bucketName || 'NO ESPECIFICADO'}`);

// Tiempo de expiración para URLs prefirmadas (en segundos)
const presignedUrlExpiration = parseInt(process.env.PRESIGNED_URL_EXPIRATION || '3600', 10);

export {
    s3Client,
    bucketName,
    presignedUrlExpiration,
};