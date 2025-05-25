import jwt from 'jsonwebtoken';
import 'dotenv/config';

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || !decoded.userId) {
        console.error('Payload del token no tiene la estructura esperada (userId)');
        return res.status(401).json({ msg: 'Token inválido (payload incorrecto)' });
      }

      req.user = {
        id: decoded.userId,
        email: decoded.email,
      };
      next();
    } catch (error) {
      console.error('Error al verificar el token:', error.message);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ msg: 'Token inválido (error firma/formato)' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ msg: 'Token expirado' });
      } else {
        return res.status(401).json({ msg: 'No autorizado, problema con el token' });
      }
    }
  }

  if (!token) {
    return res.status(401).json({ msg: 'No autorizado, no se encontró token' });
  }
};