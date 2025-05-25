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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Folder = mongoose.model('Folder', FolderSchema);

export default Folder;