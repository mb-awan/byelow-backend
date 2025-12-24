# 🚀 Byelow Backend API

Express TypeScript backend for the Byelow SEO Platform - serves both `byelow-dashboard` and `byelow-frontend`.

## 🛠️ Getting Started

### Step 1: ⚙️ Environment Configuration

- 📄 **Create `.env.development`:** Copy `.env.example` to `.env.development`.
- 🔧 **Update `.env.development`:** Fill in necessary environment variables.
- 🛠️ **Node Version Setup:**
  - Run `bin/pre-install` in a bash terminal (e.g., Git Bash) to automatically install the recommended Node version.
  - If the script doesn't work, manually install the Node version specified in the `.nvmrc` file.

### Step 2: 📦 Install Dependencies

Run `npm install` to install all required packages.

### Step 3: 🏃‍♂️ Running the Project

#### Without Docker

- 🔌 **Redis Setup:**
  There are two ways to setup Redis:
  1. **Setup Redis locally**
     - 🌐 Download Redis from [redis.io](https://redis.io/download) and follow the installation instructions.
     - 🚀 Start Redis server by running `redis-server` in your terminal.
  2. **Setup Redis locally via Docker**
     - 🐳 Run the following command to fetch and start the Redis Docker container:
       ```bash
       npm run start-redis
       ```
     - 🔗 This will start the Redis container and map it to the default port 6379 on your host.

- 🛠️ **Development Mode:** Start the project in development mode with `npm run dev`.
- 🏗️ **Building:** Build the project using `npm run build`.
- 🚀 **Production Mode:**
  - Set up `.env.production.local` according to `.env.example`.
  - Run the following commands to build and start the project:
    ```bash
    npm run build && npm run start
    ```

#### Using Docker

- 🐳 **Prerequisites:**
  - Ensure `docker` and `docker-compose` are installed.
  - Start the Docker engine using the **Docker Desktop App**.
- 🛠️ **Development Workflow:**
  - **Create `.env.development.docker`:** Copy `.env.example` to `.env.development.docker`.
  - **Start Application:** To start the Docker container in development mode:
    ```bash
    npm run start-docker:dev
    ```
  - **Install Dependencies:** If dependencies aren't installed automatically, run:
    ```bash
    npm run install-dependencies-docker:dev
    ```
  - **Stop Application:** To stop the Docker container:
    ```bash
    npm run stop-docker:dev
    ```
- 🚀 **Production Workflow:**
  - **Create `.env.production.docker`:** Copy `.env.example` to `.env.production.docker`.
  - **Start Application:** To start the Docker container in production mode:
    ```bash
    npm run start-docker:prod
    ```
  - **Install Dependencies:** If dependencies aren't installed automatically, run:
    ```bash
    npm run install-dependencies-docker:prod
    ```
  - **Stop Application:** To stop the Docker container:
    ```bash
    npm run stop-docker:prod
    ```

## 📡 API Endpoints

### Health Check
- `GET /api/health-check` - Check API health status

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/google` - Google OAuth authentication
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update user profile
- `POST /api/users/me/profile-pic` - Upload profile picture

### SEO Projects
- `GET /api/projects` - Get all SEO projects for authenticated user
- `POST /api/projects` - Create a new SEO project
- `GET /api/projects/:id` - Get a specific SEO project
- `PATCH /api/projects/:id` - Update a SEO project
- `DELETE /api/projects/:id` - Delete (archive) a SEO project

### DA/PA Checker
- `POST /api/da-pa-checker/analyze` - Analyze a domain's Domain Authority/Page Authority
- `GET /api/da-pa-checker/history` - Get analysis history
- `GET /api/da-pa-checker/:id` - Get a specific analysis by ID

### API Documentation
- `GET /api/docs` - Swagger UI documentation

## 📁 Project Structure

```
byelow-backend/
├── src/
│   ├── apis/                    # API routes and controllers
│   │   ├── auth/               # Authentication endpoints
│   │   ├── users/              # User management
│   │   ├── seo-projects/        # SEO project management
│   │   ├── da-pa-checker/      # DA/PA analysis
│   │   └── healthCheck/        # Health check endpoint
│   ├── api-docs/               # Swagger/OpenAPI documentation
│   ├── common/                 # Shared utilities and models
│   │   ├── constants/         # Constants and enums
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Mongoose models
│   │   └── utils/            # Utility functions
│   ├── server.ts              # Express app setup
│   └── index.ts              # Entry point
├── .env.example              # Environment variables template
├── package.json
└── tsconfig.json
```

## 🔧 Environment Variables

Required environment variables (see `.env.example` for full list):

- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET_KEY` - JWT secret for token signing
- `FRONTEND_URL` - Primary frontend URL
- `CORS_ORIGIN` - Semicolon-separated list of allowed frontend URLs
- `REDIS_HOST`, `REDIS_PORT` - Redis connection details
- `SMTP_*` - Email configuration (for password reset, etc.)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth credentials

## 🧪 Testing

- Run tests: `npm test`
- Run tests in watch mode: `npm run test:dev`
- Run tests with coverage: `npm run test:cov`

## 📝 Code Quality

- Lint code: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Format code: `npm run format`

## 🚀 Deployment

The backend can be deployed using:
- **PM2**: `npm run start:pm2`
- **Docker**: See Docker workflow above
- **Traditional**: `npm run build && npm run start`

## 📚 Additional Resources

- See `CLEANUP_SUMMARY.md` for details on removed features
- See `MIGRATION_NOTES.md` for migration details from unify-posts

## 💡 Notes

- The backend is focused on SEO tools (projects, DA/PA checking)
- User authentication supports email/password and Google OAuth
- All endpoints require authentication except `/api/auth/*` and `/api/health-check`
- DA/PA checker currently returns dummy data - integrate with real APIs (Moz, Ahrefs) for production
