import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model.js';

export const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('El correo ya está registrado');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({ name, email, password: hashedPassword });

  const { password: _, ...userData } = user.toObject(); // Excluye contraseña
  return userData;
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error('Credenciales inválidas');
  }

  const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });

  // Devolver el token junto con la información básica del usuario
  // CAMBIO: Añadir información del usuario a la respuesta
  return { 
    token,
    user: {
      id: user._id,
      name: user.name || user.email.split('@')[0],
      email: user.email
    }
  };
};

export const updateUserProfile = async (userId, { name, email }) => {
  // Verificar si existe otro usuario con ese email
  const existingUserWithEmail = await User.findOne({ email, _id: { $ne: userId } });
  if (existingUserWithEmail) {
    throw new Error('Este correo electrónico ya está en uso');
  }

  // Actualizar el usuario
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { name, email },
    { new: true, runValidators: true }
  ).select('-password');

  if (!updatedUser) {
    throw new Error('Usuario no encontrado');
  }

  return updatedUser;
};

export const changeUserPassword = async (userId, { currentPassword, newPassword }) => {
  // Obtener el usuario con la contraseña
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  // Verificar la contraseña actual
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('La contraseña actual es incorrecta');
  }

  // Hash de la nueva contraseña
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Actualizar la contraseña
  user.password = hashedPassword;
  await user.save();

  return { message: 'Contraseña actualizada correctamente' };
};