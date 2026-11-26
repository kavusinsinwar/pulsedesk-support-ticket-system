import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

export const dashboardController = {
  async stats(req: Request, res: Response): Promise<void> {
    const stats = await dashboardService.getStats(req.user!);
    sendSuccess(res, { stats }, 'Dashboard statistics fetched successfully');
  },
};
