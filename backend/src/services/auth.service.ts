import { Role } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { comparePassword, hashPassword } from '../utils/password';
import { signJwt } from '../utils/jwt';

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    // Privilege escalation guard: public registration always assigns Role.USER
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.USER,
    });

    const token = signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return { user, token };
  },

  async login(input: { email: string; password: string }) {
    const userRecord = await userRepository.findByEmail(input.email);
    if (!userRecord) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await comparePassword(input.password, userRecord.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = signJwt({
      sub: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      name: userRecord.name,
    });

    const { passwordHash: _removed, ...user } = userRecord;
    return { user, token };
  },

  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  },

  async listAdmins() {
    return userRepository.findByRole(Role.ADMIN);
  },
};
