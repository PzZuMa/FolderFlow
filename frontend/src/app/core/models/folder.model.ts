/**
 * Modelo que representa una carpeta en la aplicación.
 * Incluye información sobre jerarquía, propietario y fechas de creación/actualización.
 */
export interface Folder {
  _id: string;           // Identificador único de la carpeta
  name: string;          // Nombre de la carpeta
  ownerId: string;       // ID del usuario propietario
  parentId: string | null; // ID de la carpeta padre (null si es raíz)
  createdAt?: string;    // Fecha de creación (opcional)
  updatedAt?: string;    // Fecha de última actualización (opcional)
}