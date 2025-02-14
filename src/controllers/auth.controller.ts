import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt:', { email });

    if (!email || !password) {
      res.status(400).json({ message: 'Email ve şifre gereklidir' });
      return;
    }

    const userRepository = getRepository(User);
    console.log('Finding user with email:', email);
    const user = await userRepository.findOne({ 
      where: { email },
      relations: ['company']
    });

    console.log('User found:', user ? 'yes' : 'no');
    if (user) {
      console.log('User details:', { 
        id: user.id,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
        hasPassword: !!user.password
      });
    }

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
      return;
    }

    console.log('Comparing passwords...');
    console.log('Input password:', password);
    console.log('Stored hash:', user.password);
    const isValidPassword = await verifyPassword(password, user.password);
    console.log('Password check:', isValidPassword ? 'valid' : 'invalid');

    if (!isValidPassword) {
      res.status(401).json({ message: 'Geçersiz kimlik bilgileri' });
      return;
    }

    // Token'ları oluştur
    console.log('Generating tokens...');
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh token'ı kaydet
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await userRepository.save(user);

    console.log('Login successful');
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.company?.id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, companyId } = req.body;

    if (!firstName || !lastName || !email || !password || !companyId) {
      res.status(400).json({ message: 'Tüm alanlar gereklidir' });
      return;
    }

    const userRepository = getRepository(User);
    const companyRepository = getRepository(Company);

    // Email kontrolü
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: 'Bu email zaten kullanımda' });
      return;
    }

    // Şirket kontrolü
    const company = await companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      res.status(400).json({ message: 'Geçersiz şirket' });
      return;
    }

    // Şifreyi hashle
    const hashedPassword = await hashPassword(password);

    // Yeni kullanıcı oluştur
    const user = userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: 'company_admin',
      company,
      isActive: true
    });

    await userRepository.save(user);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.company.id
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Yetkilendirme başarısız' });
      return;
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ where: { id: req.user.userId } });

    if (user) {
      user.refreshToken = undefined;
      await userRepository.save(user);
    }

    res.json({ message: 'Başarıyla çıkış yapıldı' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: 'Refresh token gereklidir' });
      return;
    }

    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ 
      where: { refreshToken },
      relations: ['company']
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Geçersiz refresh token' });
      return;
    }

    // Yeni token'ları oluştur
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Yeni refresh token'ı kaydet
    user.refreshToken = newRefreshToken;
    await userRepository.save(user);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
}; 