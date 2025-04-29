import mongoose from 'mongoose';

const FolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la carpeta es obligatorio.'],
      trim: true,
      maxlength: [100, 'El nombre no puede exceder los 100 caracteres.'],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId, // Referencia al _id del usuario
      ref: 'User', // Referencia al modelo 'User'
      required: true,
      index: true, // Indexar para búsquedas eficientes por propietario
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId, // Referencia a otra carpeta (_id)
      ref: 'Folder', // Referencia al mismo modelo 'Folder'
      default: null, // null indica que está en el nivel raíz del usuario
      index: true, // Indexar para búsquedas eficientes por carpeta padre
    },
    // createdAt y updatedAt se añaden automáticamente con timestamps: true
  },
  {
    timestamps: true, // Añade createdAt y updatedAt automáticamente
  }
);

// Evitar nombres de carpeta duplicados DENTRO de la misma carpeta padre y para el mismo dueño
// Nota: Mongoose < 5.11 might require creating index manually in MongoDB Atlas or using mongoose.connect options
// FolderSchema.index({ parentId: 1, ownerId: 1, name: 1 }, { unique: true });
// Para Mongoose 5.11+ y MongoDB 4.2+, puedes intentar definirlo aquí,
// pero la forma más segura es crear el índice compuesto en tu DB (Atlas UI o Shell).
// Considera manejar la duplicidad en la lógica del servicio si el índice da problemas.

const Folder = mongoose.model('Folder', FolderSchema);

export default Folder;