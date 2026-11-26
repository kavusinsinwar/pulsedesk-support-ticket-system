import { Prisma, Role, User } from '@prisma/client';
import { prisma } from '../config/prisma';

export type PublicUser = Omit<User, 'passwordHash'>;

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  },

  async findById(id: string): Promise<PublicUser | null> {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  },

  async findByRole(role: Role): Promise<PublicUser[]> {
    return prisma.user.findMany({
      where: { role },
      select: publicUserSelect,
    });
  },

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: Role;
  }): Promise<PublicUser> {
    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        role: data.role ?? Role.USER,
      },
      select: publicUserSelect,
    });
  },
};
