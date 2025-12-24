import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { SEOProject } from '@/common/models/seoProject';
import { handleError } from '@/common/utils/handleError';

// Helper to send dashboard-compatible response format
const sendResponse = (res: Response, success: boolean, message: string, data: any, statusCode: number) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

export const createSEOProject = async (req: Request, res: Response) => {
  try {
    const { name, domain } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const project = new SEOProject({
      userId,
      name,
      domain,
      healthScore: 0,
      status: 'active',
    });

    await project.save();

    return sendResponse(res, true, 'Project created successfully', project, StatusCodes.CREATED);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      return sendResponse(res, false, 'A project with this domain already exists', null, StatusCodes.BAD_REQUEST);
    }
    handleError(error, res);
  }
};

export const getSEOProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const projects = await SEOProject.find({ userId, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();

    return sendResponse(res, true, 'Projects retrieved successfully', projects, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};

export const getSEOProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const project = await SEOProject.findOne({
      _id: id,
      userId,
    }).exec();

    if (!project) {
      return sendResponse(res, false, 'Project not found', null, StatusCodes.NOT_FOUND);
    }

    return sendResponse(res, true, 'Project retrieved successfully', project, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};

export const updateSEOProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const project = await SEOProject.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true }
    ).exec();

    if (!project) {
      return sendResponse(res, false, 'Project not found', null, StatusCodes.NOT_FOUND);
    }

    return sendResponse(res, true, 'Project updated successfully', project, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};

export const deleteSEOProject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendResponse(res, false, 'User not authenticated', null, StatusCodes.UNAUTHORIZED);
    }

    const project = await SEOProject.findOneAndUpdate(
      { _id: id, userId },
      { $set: { status: 'archived' } }
    ).exec();

    if (!project) {
      return sendResponse(res, false, 'Project not found', null, StatusCodes.NOT_FOUND);
    }

    return sendResponse(res, true, 'Project deleted successfully', null, StatusCodes.OK);
  } catch (error) {
    handleError(error, res);
  }
};

