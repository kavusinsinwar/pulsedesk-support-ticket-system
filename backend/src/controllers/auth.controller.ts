import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 'Account registered successfully', 201);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Logged in successfully');
  },

  async me(req: Request, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.id);
    sendSuccess(res, { user }, 'Profile fetched successfully');
  },

  async listAdmins(_req: Request, res: Response): Promise<void> {
    const admins = await authService.listAdmins();
    sendSuccess(res, { admins }, 'Admins fetched successfully');
  },
};
