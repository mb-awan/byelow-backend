# Byelow Backend API Documentation

Complete API documentation for the Byelow SEO Platform backend.

## API Overview

The Byelow Backend API provides endpoints for:
- **Authentication** - User sign up, sign in, password management
- **Users** - User profile management
- **SEO Projects** - Project management for SEO tracking
- **DA/PA Checker** - Domain Authority and Page Authority analysis

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Health Check

#### GET `/api/health-check`
Check API health status.

**Response:**
```json
{
  "success": true,
  "message": "Service is healthy",
  "responseObject": null,
  "statusCode": 200
}
```

### Authentication

#### POST `/api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token-here"
}
```

#### POST `/api/auth/login`
Login with credentials.

**Request Body:**
```json
{
  "identifier": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "token": "jwt-token-here",
  "TFAEnabled": false,
  "role": "user"
}
```

### Users

#### GET `/api/users/me`
Get current user profile.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "_id": "user-id",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "emailVerified": true,
    "profilePicture": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PATCH `/api/users/me`
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith"
}
```

### SEO Projects

#### GET `/api/projects`
Get all SEO projects for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [
    {
      "_id": "project-id",
      "userId": "user-id",
      "name": "My Blog",
      "domain": "myblog.com",
      "healthScore": 85,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/projects`
Create a new SEO project.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "My Blog",
  "domain": "myblog.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project created successfully",
  "data": {
    "_id": "project-id",
    "userId": "user-id",
    "name": "My Blog",
    "domain": "myblog.com",
    "healthScore": 0,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/projects/:id`
Get a specific SEO project by ID.

**Headers:** `Authorization: Bearer <token>`

#### PATCH `/api/projects/:id`
Update an SEO project.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Updated Name",
  "healthScore": 90,
  "status": "active"
}
```

#### DELETE `/api/projects/:id`
Delete (archive) an SEO project.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully",
  "data": null
}
```

### DA/PA Checker

#### POST `/api/da-pa-checker/analyze`
Analyze a domain's Domain Authority and Page Authority.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "domain": "example.com",
  "projectId": "optional-project-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain analysis completed successfully",
  "data": {
    "_id": "analysis-id",
    "userId": "user-id",
    "projectId": "project-id",
    "domain": "example.com",
    "domainAuthority": 65,
    "pageAuthority": 58,
    "totalBacklinks": 1250,
    "referringDomains": 375,
    "dofollowLinks": 875,
    "nofollowLinks": 375,
    "spamScore": 5,
    "organicTrafficEstimate": 15000,
    "topBacklinks": [
      {
        "domain": "techcrunch.com",
        "domainAuthority": 93,
        "linkType": "dofollow",
        "anchorText": "innovation"
      }
    ],
    "topAnchorTexts": [
      {
        "text": "brand name",
        "count": 75
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### GET `/api/da-pa-checker/history`
Get analysis history for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of results to return (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Analysis history retrieved successfully",
  "data": [
    {
      "_id": "analysis-id",
      "domain": "example.com",
      "domainAuthority": 65,
      "pageAuthority": 58,
      ...
    }
  ]
}
```

#### GET `/api/da-pa-checker/:id`
Get a specific analysis by ID.

**Headers:** `Authorization: Bearer <token>`

## Response Format

All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "data": null
}
```

## Swagger Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/swagger.json`

## Database Seeding

To seed the database with sample data:

```bash
# Development
npm run seed:dev

# Production
npm run seed:prod
```

This will create:
- 3 sample users (admin, demo, testuser)
- 5 sample SEO projects
- 5 sample DA/PA analyses

**Default Credentials:**
- Admin: `admin@byelow.com` / `Admin123!@#`
- Demo: `demo@byelow.com` / `Demo123!@#`
- Test: `test@byelow.com` / `Test123!@#`

## Error Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Domain names are automatically lowercased
- Project deletion is soft (status set to 'archived')
- DA/PA analysis currently returns dummy data (real API integration pending)

