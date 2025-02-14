import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
};

// Test amaçlı kullanılabilecek yardımcı fonksiyon
export const generateTestHash = async (password: string = 'admin123'): Promise<string> => {
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    
    if (!isValid) {
        throw new Error('Hash doğrulama başarısız!');
    }
    
    if (!hash.startsWith('$2a$')) {
        throw new Error('Geçersiz hash formatı!');
    }

    return hash;
}; 