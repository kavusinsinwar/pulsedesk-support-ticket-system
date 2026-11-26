import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { verifyJwt } from '../utils/jwt';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { userRepository } from '../repositories/user.repository';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const payload = verifyJwt(token);
    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedError('User account no longer exists');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    next(new UnauthorizedError('Invalid or expired authentication token'));
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions for this operation'));
      return;
    }

    next();
  };
}
