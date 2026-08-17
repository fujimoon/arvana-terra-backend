import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';
import { AppError } from '../middleware/error';
import { AuthPayload } from '../types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409);

    const validRoles: UserRole[] = ['landlord', 'homeowner', 'employer'];
    if (!validRoles.includes(data.role)) {
      throw new AppError('Invalid role. Must be landlord, homeowner, or employer', 400);
    }

    const password = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password,
        name: data.name,
        role: data.role,
        phone: data.phone,
      },
    });

    // Create default preference
    await prisma.userPreference.create({
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens({ userId: user.id, email: user.email, role: user.role });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findFirst({ where: { email, isActive: true } });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const tokens = await this.generateTokens({ userId: user.id, email: user.email, role: user.role });
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new AppError('Invalid or expired refresh token', 401);
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens({
      userId: stored.user.id,
      email: stored.user.email,
      role: stored.user.role,
    });
    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        profileImageUrl: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateMe(userId: string, data: {
    name?: string;
    phone?: string;
    address?: string;
    bio?: string;
    profileImageUrl?: string;
  }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        profileImageUrl: true,
        bio: true,
        updatedAt: true,
      },
    });
    return user;
  }

  private async generateTokens(payload: AuthPayload) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRES,
    } as jwt.SignOptions);

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_DAYS);

    await prisma.refreshToken.create({
      data: { userId: payload.userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
