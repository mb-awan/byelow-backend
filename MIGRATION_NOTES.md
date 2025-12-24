# Backend Migration Notes

This document outlines the changes made to adapt `byelow-backend` to serve both `byelow-dashboard` and `byelow-frontend`.

## Changes Made

### 1. Package Updates
- Updated `package.json` name from `unify-posts-backend` to `byelow-backend`
- Updated description to reflect it serves both frontends

### 2. New Models Added

#### SEO Project Model (`src/common/models/seoProject.ts`)
- Represents SEO projects with fields: `name`, `domain`, `healthScore`, `status`
- Different from the existing design `Project` model (which has `json`, `height`, `width` for design projects)

#### DA/PA Analysis Model (`src/common/models/dapaAnalysis.ts`)
- Represents Domain Authority/Page Authority analysis results
- Includes metrics like `domainAuthority`, `pageAuthority`, `totalBacklinks`, `referringDomains`, etc.

### 3. New API Endpoints

#### SEO Projects API (`/api/projects` and `/api/seo-projects`)
- `GET /api/projects` - Get all SEO projects for authenticated user
- `POST /api/projects` - Create a new SEO project
- `GET /api/projects/:id` - Get a specific SEO project
- `PATCH /api/projects/:id` - Update a SEO project
- `DELETE /api/projects/:id` - Delete (archive) a SEO project

#### DA/PA Checker API (`/api/da-pa-checker`)
- `POST /api/da-pa-checker/analyze` - Analyze a domain's DA/PA
- `GET /api/da-pa-checker/history` - Get analysis history
- `GET /api/da-pa-checker/:id` - Get a specific analysis by ID

### 4. Route Changes

- **SEO Projects**: Available at `/api/projects` (for dashboard compatibility) and `/api/seo-projects`
- **Design Projects**: Moved to `/api/design-projects` (from original `/api/projects`)
  - If you need design projects functionality, update frontend to use `/api/design-projects`

### 5. Response Format

The new SEO endpoints return responses in the format expected by the dashboard frontend:
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

This differs from the existing backend's `ServiceResponse` format which uses `responseObject` instead of `data`.

### 6. CORS Configuration

CORS is configured to accept multiple origins. Set the `CORS_ORIGIN` environment variable with semicolon-separated URLs:
```
CORS_ORIGIN=http://localhost:3000;http://localhost:3001;https://dashboard.byelow.com;https://app.byelow.com
```

## Environment Variables

Make sure to set the following environment variables:

- `CORS_ORIGIN` - Semicolon-separated list of allowed frontend URLs
- `FRONTEND_URL` - Primary frontend URL
- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET_KEY` - JWT secret for authentication
- Other existing environment variables as needed

## Next Steps

1. **Update Dashboard Frontend**: 
   - Ensure it points to the correct backend URL
   - The API endpoints should work as-is since they match the expected format

2. **Update Frontend URLs**:
   - Update `NEXT_PUBLIC_API_URL` in both frontends to point to this backend

3. **Authentication**:
   - Ensure authentication middleware is properly configured
   - The new endpoints use the `authenticate` middleware from `@/common/middleware/user`

4. **Database**:
   - Run migrations if needed
   - The new models will be created automatically when the server starts

5. **Testing**:
   - Test all endpoints with both frontends
   - Verify CORS is working correctly
   - Check authentication flow

## Notes

- The DA/PA checker currently generates dummy data. You'll need to integrate with a real DA/PA service (like Moz, Ahrefs, etc.) in the future
- User authentication is required for all SEO endpoints
- The existing design projects functionality has been moved to `/api/design-projects` to avoid conflicts


