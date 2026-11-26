import { Request, Response } from 'express';
import { commentService } from '../services/comment.service';
import { sendSuccess } from '../utils/response';

export const commentController = {
  async create(req: Request, res: Response): Promise<void> {
    const comment = await commentService.addComment(
      req.user!,
      req.params.id,
      req.body.content
    );
    sendSuccess(res, { comment }, 'Comment added successfully', 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const comments = await commentService.getComments(req.user!, req.params.id);
    sendSuccess(res, { comments }, 'Comments fetched successfully');
  },
};
