# Lock-In Backend API 🔒

Lock-In is a productivity and habit-tracking application designed to help users build better routines and stay focused. This repository contains the backend API built with Node.js, Express, and Sequelize.

## 🚀 Features

- **Authentication System**: Secure login/register with JWT and Refresh Tokens (using HTTP-only cookies).
- **Habit Tracking**: Full CRUD operations for managing habits.
- **AI Productivity Assistant**: Integration with OpenAI to generate personalized daily schedules.
- **Security First**: 
  - Helmet for security headers.
  - CORS configuration.
  - Rate limiting to prevent abuse.
  - Secure password hashing with bcrypt.
- **Database Management**: Robust ORM with Sequelize and PostgreSQL.
- **Health Monitoring**: Built-in `/health` endpoint for monitoring server status.
- **Performance**: Gzip compression and efficient request logging with Morgan.

## 🛠 Tech Stack

- **Core**: Node.js, Express.js (v5+)
- **Database**: PostgreSQL, Sequelize ORM
- **Security**: JWT, BcryptJS, Helmet, Express Rate Limit
- **AI**: OpenAI API (GPT-3.5)
- **Validation**: Joi
- **Testing**: Jest
- **Utilities**: Axios, Date-fns, Dotenv, Morgan, Compression, Cookie-parser

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [PostgreSQL](https://www.postgresql.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

## ⚙️ Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/fikri221/lock-in-be.git
cd lock-in-be
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory and configure the following variables:

```env
NODE_ENV = development
PORT = 5000

# Database Configuration
DATABASE_URL = postgresql://user:password@localhost:5432/lock_in

# JWT Configuration
JWT_SECRET = your_jwt_secret
JWT_EXPIRES = 7d
JWT_REFRESH_SECRET = your_refresh_secret
JWT_REFRESH_EXPIRES = 30d

# CORS Configuration
FRONTEND_URL = http://localhost:3000

# OAuth Configuration (Optional/Placeholder)
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GITHUB_CLIENT_ID = your_github_client_id
GITHUB_CLIENT_SECRET = your_github_client_secret

# AI API Configuration
OPENAI_API_KEY = your_openai_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 200

# Testing
USE_DUMMY = true
```

### 4. Database Migration & Seeding
```bash
# Run migrations
npm run migrate

# (Optional) Seed initial data
npm run seed
```

### 5. Running the Application
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

## 🛣 API Endpoints

### Auth
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive tokens
- `POST /api/auth/logout` - Clear cookies and logout
- `POST /api/auth/refresh` - Refresh access token

### Habits
- `GET /api/habits` - Get all habits for the authenticated user
- `POST /api/habits` - Create a new habit
- `PUT /api/habits/:id` - Update a habit
- `DELETE /api/habits/:id` - Delete a habit

### AI Assistant
- `POST /api/ai` - Generate a productive schedule based on a prompt

### System
- `GET /health` - Check API health status

## 🧪 Testing
```bash
npm test
```

## 📁 Project Structure
```
lock-in-be/
├── src/
│   ├── config/       # Database & environment configurations
│   ├── controllers/  # Request handlers
│   ├── middlewares/  # Custom Express middlewares
│   ├── models/       # Sequelize models
│   ├── routes/       # API route definitions
│   ├── services/     # Business logic
│   └── tests/        # Unit and integration tests
├── server.js         # Entry point
└── .env              # Environment variables
```

## 📄 License
This project is licensed under the MIT License.

---
Built with ❤️ by [Fikri Lazuardi](https://github.com/fikri221)
