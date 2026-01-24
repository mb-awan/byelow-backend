import express, { Router } from 'express';

import { authenticate } from '@/common/middleware/user';
import { validateRequest } from '@/common/utils/httpHandlers';

import { createSEOProject, deleteSEOProject, getSEOProjectById, getSEOProjects, updateSEOProject } from './controllers';
import {
  CreateSEOProjectSchema,
  DeleteSEOProjectSchema,
  GetSEOProjectByIdSchema,
  UpdateSEOProjectSchema,
} from './validationSchemas';

export const SEO_PROJECTS_PATHS = {
  GET_PROJECTS: '/',
  CREATE_PROJECT: '/',
  GET_PROJECT_BY_ID: '/:id',
  UPDATE_PROJECT: '/:id',
  DELETE_PROJECT: '/:id',
};

export const seoProjectsRouter: Router = (() => {
  const router = express.Router();

  // Get all projects for the authenticated user
  router.get(SEO_PROJECTS_PATHS.GET_PROJECTS, authenticate, getSEOProjects);

  // Create a new project
  router.post(
    SEO_PROJECTS_PATHS.CREATE_PROJECT,
    authenticate,
    validateRequest(CreateSEOProjectSchema),
    createSEOProject
  );

  // Get a project by ID
  router.get(
    SEO_PROJECTS_PATHS.GET_PROJECT_BY_ID,
    authenticate,
    validateRequest(GetSEOProjectByIdSchema),
    getSEOProjectById
  );

  // Update a project
  router.patch(
    SEO_PROJECTS_PATHS.UPDATE_PROJECT,
    authenticate,
    validateRequest(UpdateSEOProjectSchema),
    updateSEOProject
  );

  // Delete a project (soft delete by archiving)
  router.delete(
    SEO_PROJECTS_PATHS.DELETE_PROJECT,
    authenticate,
    validateRequest(DeleteSEOProjectSchema),
    deleteSEOProject
  );

  return router;
})();
