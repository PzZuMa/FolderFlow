import mongoose from 'mongoose';
const { Schema, model } = mongoose; // Destructurar directamente

const DocumentSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
        isFavorite: {
        type: Boolean,
        default: false
    },
    s3Key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    folderId: {
        type: Schema.Types.ObjectId,
        ref: 'Folder',
        default: null,
        index: true,
    },
}, {
    timestamps: true
});

DocumentSchema.index({ ownerId: 1, folderId: 1 });

// Exportación por defecto
const Document = model('Document', DocumentSchema);
export default Document;