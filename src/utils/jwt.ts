import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  companyId?: string;
}

export const generateAccessToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.company?.id
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1h'
  });
};

export const generateRefreshToken = (user: User): string => {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.company?.id
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!) as TokenPayload;
}; 