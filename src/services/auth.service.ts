import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error';

export class AuthService {
  async register(data: { email: string; password: string; name: string; phone?: string; role?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('このメールアドレスは既に登録されています', 400);

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        phone: data.phone,
        role: data.role || 'homeowner'
      }
    });

    const token = this.signToken(user.id, user.email, user.role);
    return { user: this.sanitize(user), token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError('メールアドレスまたはパスワードが正しくありません', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('メールアドレスまたはパスワードが正しくありません', 401);

    const token = this.signToken(user.id, user.email, user.role);
    return { user: this.sanitize(user), token };
  }

  private signToken(id: string, email: string, role: string): string {
    const secret = process.env.JWT_SECRET || 'default_secret';
    return jwt.sign({ id, email, role }, secret, { expiresIn: '7d' });
  }

  private sanitize(user: { id: string; email: string; name: string; phone: string | null; role: string; createdAt: Date }) {
    const { ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
