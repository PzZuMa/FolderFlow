import fs from 'fs';
import swaggerJSDoc from 'swagger-jsdoc';

// Ajusta las rutas y la configuración según tu proyecto
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FolderFlow API',
      version: '1.0.0',
      description: 'Documentación de la API de FolderFlow',
    },
    servers: [
      { url: 'http://localhost:3000/api' }
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60f7c2e8b4d1c2a5d8e4b123' },
            name: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', example: 'juan@email.com' },
            profileImage: { type: 'string', example: 'default-profile.png' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Folder: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            ownerId: { type: 'string' },
            parentId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Document: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            isFavorite: { type: 'boolean' },
            s3Key: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
            ownerId: { type: 'string' },
            folderId: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: [
    './src/routes/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

fs.writeFileSync('./swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('Swagger JSON exportado en swagger.json');