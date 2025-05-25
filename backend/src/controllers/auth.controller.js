import {
  registerUser,
  loginUser,
  updateUserProfile,
  changeUserPassword,
  updateUserProfileImage,
} from '../services/auth.service.js';

export const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;
    const updatedUser = await updateUserProfile(userId, profileData);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileImage } = req.body;
    const updatedUser = await updateUserProfileImage(userId, profileImage);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error actualizando imagen de perfil:', error);
    res.status(400).json({ message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const passwordData = req.body;
    const result = await changeUserPassword(userId, passwordData);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    res.status(400).json({ message: error.message });
  }
};