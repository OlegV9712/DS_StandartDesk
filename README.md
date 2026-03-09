# 🚀 StandartDesk - Professional Project Management & Design Platform

> **Production-Ready** with comprehensive security hardening, testing infrastructure, and PostgreSQL support

A modern web application for creating and managing block diagrams with complete audit logging, user management, role-based access control, and enterprise-grade security features.

## 🔒 Security Features (Enterprise-Grade)

### ✅ Authentication & Authorization
- **Pbkdf2-SHA256** password hashing with 50,000 iterations
- **Timing-safe** password comparison (prevents timing attacks)
- **JWT-based** token authentication with configurable expiry
- **Role-based access control** (Admin, Manager, User, Guest)
- **OAuth2-compatible** token structure
- **Session management** with automatic logout on 401

### ✅ Input Validation & Sanitization
- **Email validation** with RFC compliance checks
- **Username validation** (3-50 chars, alphanumeric only)
- **Password strength requirements** (uppercase, lowercase, digits, special chars)
- **URL validation** for avatars and resources
- **Control character removal** to prevent injection attacks
- **Input length limits** enforced database-wide

### ✅ API Security
- **Rate Limiting** (AspNetCoreRateLimit)
  - 100 requests/minute default
  - 5 login attempts per 15 minutes
  - 10 registrations per hour
- **CORS protection** - Whitelist-based origin validation
- **Security Headers**:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy headers
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: strict-origin-when-cross-origin

### ✅ Database Security
- **Parameterized queries** (Entity Framework Core)
- **SQL Injection prevention** built-in
- **Unique constraints** on username and email
- **Foreign key relationships** with cascading rules
- **Audit logging** for all modifications

---

## 📊 Comprehensive Testing (26+ Tests)

### Unit Tests - SecurityService
- ✅ Password hashing & verification
- ✅ Email/Username validation
- ✅ Password strength validation
- ✅ URL and input sanitization
- ✅ Timing-safe comparison

### Integration Tests - Controllers
- ✅ Authentication flow (login, register, verify)
- ✅ Authorization enforcement
- ✅ User profile management
- ✅ Error handling & status codes
- ✅ JWT token validation

### API Tests
- ✅ Endpoint security
- ✅ Authorization checks
- ✅ Data persistence
- ✅ Rate limit enforcement

```bash
# Run all tests
cd standart-desk-tests && dotnet test

# View testing guide
cat TESTING_GUIDE.md
```

---

## 🚀 Performance Optimizations

## 🗄️ Database Architecture

**SQLite** with Entity Framework Core:
- Users table with roles, avatars, status
- Projects table with ownership
- Pages table for project organization
- BlockSchemas table for diagram content
- BlockSchemaVersions for version history
- AuditLogs for complete audit trail

## 📱 System Architecture

```
Frontend (React + Vite)                Backend (ASP.NET Core 9.0)
    ↓                                        ↓
  http://localhost:5173           http://localhost:5000
  
├─ Login (clean, no credentials)    API Endpoints:
├─ Dashboard                         ├─ POST /api/auth/login
├─ Admin Panel                       ├─ GET /api/admin/users
│  ├─ Users Management              ├─ POST /api/admin/users
│  ├─ Statistics                     ├─ PUT /api/admin/users/{id}
│  └─ Audit Logs                     ├─ DELETE /api/admin/users/{id}
├─ Project Editor                    ├─ GET /api/admin/logs
├─ Canvas Editor                     ├─ GET /api/admin/stats
└─ Settings                          ├─ GET /api/projects
                                     ├─ POST /api/projects
                                     └─ ... more endpoints
                                     
                                     Database: SQLite
                                     └─ 6 tables with relationships
```

## 🛠️ Quick Start

### Prerequisites
- .NET 9.0 SDK
- Node.js 18+ with npm
- SQLite (included)

### Backend Setup
```bash
cd standart-desk-backend
dotnet restore
dotnet build -c Release
dotnet run --no-build -c Release
```
Backend runs on: `http://localhost:5000`

### Frontend Setup
```bash
cd standart-desk-frontend
npm install
npm run dev
```
Frontend runs on: `http://localhost:5173`

### First Login
1. Backend auto-creates default admin account
2. Check backend logs for credentials
3. Or create a new user through admin panel

## 🎯 Key Use Cases

### Creating a Block Diagram
1. Navigate to Dashboard → Create Project
2. Click on project to open editor
3. Use toolbar to add shapes (process, decision, data, start/end)
4. Drag shapes to position them
5. Click "Connect" to link blocks
6. Right-click blocks to edit text or color
7. Save your diagram

### Managing Users
1. Navigate to Admin Panel
2. Go to Users tab
3. Create new users or manage existing ones
4. Set roles and status
5. View all changes in Audit Logs

### Viewing Audit Trail
1. Go to Admin Panel → Audit Logs
2. See who did what, when
3. Track all changes with timestamps
4. Original and modified values visible

## 📝 API Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Token verification

### Admin Operations (requires Admin role)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/logs?page=1&pageSize=100` - Audit logs

### Project Management
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Block Schemas
- `GET /api/blockschemas/page/{pageId}` - Get page schemas
- `POST /api/blockschemas` - Create schema
- `PUT /api/blockschemas/{id}` - Save schema
- `GET /api/blockschemas/{id}/versions` - Version history
- `POST /api/blockschemas/{id}/revert` - Revert to version

## 🔐 Security Details

| Feature | Implementation |
|---------|-----------------|
| Password Hashing | PBKDF2-SHA256 (10,000 iterations) |
| Password Salt | Random 16-byte salt per user |
| Authentication | JWT tokens (stored in localStorage) |
| Authorization | Role-based (RBAC) on every endpoint |
| Audit Trail | Immutable logs with full change history |
| Session | Token-based, no server sessions |

## 📁 Project Structure

```
StandartHelper/
├── standart-desk-backend/
│   ├── Controllers/          # API endpoints
│   ├── Models/               # Data entities
│   ├── Services/             # Business logic
│   ├── Data/                 # Database context
│   ├── DTOs/                 # Data transfer objects
│   ├── Migrations/           # Database migrations
│   ├── Program.cs            # Configuration
│   └── StandartDesk.csproj   # Project file
│
├── standart-desk-frontend/
│   ├── src/
│   │   ├── pages/            # React pages
│   │   ├── components/       # React components
│   │   ├── services/         # API & SignalR
│   │   ├── store/            # State management
│   │   ├── styles/           # CSS
│   │   ├── types/            # TypeScript types
│   │   ├── App.tsx           # Main component
│   │   └── main.tsx          # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── README.md                 # This file
└── RUN_ME.txt                # Quick start guide
```

## 🌟 Technologies Used

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend Runtime** | .NET | 9.0 |
| **Backend Framework** | ASP.NET Core | 9.0 |
| **Database** | SQLite | 3.x |
| **ORM** | Entity Framework Core | 8.0 |
| **Frontend Framework** | React | 18.2 |
| **Build Tool** | Vite | 5.0 |
| **Language** | TypeScript | Latest |
| **State Management** | Zustand | Latest |

---

## 🚀 Performance Optimizations

### Frontend Performance
- **Code Splitting**: Dashboard, ProjectEditor, TaskManager load on-demand
- **Lazy Loading**: Components use React.lazy() + Suspense
- **API Caching**: 5-minute TTL with request deduplication
- **Bundle Optimization**: 
  - Vendor chunks: react, axios, zustand separately
  - Terser minification with dead code elimination
  - Gzip compression enabled
- **Memory Optimization**: 
  - Zustand selectors prevent unnecessary re-renders
  - Memoization for expensive computations
  - Debouncing for search and filters

### Backend Performance
- **Database Indexing**: Indexed on frequently queried columns
- **Async/Await**: All I/O operations non-blocking
- **Connection Pooling**: Optimized database connections
- **Caching Layer**: Planned Redis integration ready

---

## 📦 Deployment

### SQLite to PostgreSQL Migration
- **Complete migration guide** in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Includes schema setup and configuration steps
- Production-ready connection strings

### Docker Support
```bash
# Build backend image
docker build -f Dockerfile -t standart-desk-backend .

# Run with PostgreSQL
docker run -e DATABASE_URL=postgresql://... standart-desk-backend
```

### Environment Configuration
```bash
# Development (.env)
ASPNETCORE_ENVIRONMENT=Development
Jwt__Key=dev-key

# Production (.env)
ASPNETCORE_ENVIRONMENT=Production
Jwt__Key=secure-key-with-64-chars-minimum
Database__Provider=postgresql
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Production setup, PostgreSQL migration, Docker |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | Running tests, test coverage, CI/CD setup |
| [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | Security hardening, best practices |
| [API_ENDPOINTS.md](./API_ENDPOINTS.md) | Complete endpoint documentation |

---

## 🔧 Development Setup

### Prerequisites
- .NET 9.0 SDK
- Node.js 18+
- Docker (optional)

### Backend Development
```bash
cd standart-desk-backend

# Restore dependencies
dotnet restore

# Run migrations (auto on startup)
dotnet ef database update

# Start development server
dotnet run

# Build
dotnet build -c Release

# Run tests
cd ../standart-desk-tests && dotnet test
```

### Frontend Development
```bash
cd standart-desk-frontend

# Install dependencies
npm install

# Start dev server (runs on :5173)
npm run dev

# Build production bundle
npm run build

# Analyze bundle size
npm run analyze

# Type checking
npm run type-check
```

---

## 🔐 Security Checklist

**Pre-production Verification:**
- [ ] Update JWT key (minimum 64 characters)
- [ ] Configure PostgreSQL instead of SQLite
- [ ] Set HTTPS/SSL certificates
- [ ] Configure CORS origins to production domains
- [ ] Enable all security headers in production
- [ ] Set up log monitoring and alerting
- [ ] Enable audit logging review process
- [ ] Configure automated backups
- [ ] Update default admin credentials
- [ ] Enable rate limiting
- [ ] Review and update security policies

---

## 🐛 Troubleshooting

### Backend Issues
```bash
# Connection string error
→ Check appsettings.json Database:Provider setting

# JWT token invalid
→ Verify JWT:Key is configured (64+ chars)

# CORS error
→ Add your frontend domain to AllowedOrigins

# Test failures
→ Ensure in-memory database is used in tests
```

### Frontend Issues
```bash
# API connection refused
→ Ensure backend is running on localhost:5000

# Components not loading
→ Check browser console for module loading errors

# Performance issues
→ Run 'npm run analyze' to check bundle size
```

---

## 📞 Support & Contributing

For issues, questions, or contributions:
1. Check documentation files first
2. Review TESTING_GUIDE.md for test patterns
3. Consult DEPLOYMENT_GUIDE.md for deployment issues

---

## 📄 License

Proprietary - All rights reserved

---

**Last Updated**: March 2026  
**Status**: Production-Ready ✅
| **UI Animations** | Framer Motion | Latest |
| **HTTP Client** | Fetch API | Native |
| **Real-time** | SignalR (optional) | Latest |

## 🐛 Troubleshooting

### Port Conflicts
```bash
# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Issues
```bash
# Backup current database
mv standart-desk.db standart-desk.db.backup

# Restart backend to recreate fresh database
dotnet run
```

### Frontend Connection Issues
- Verify backend is running on `http://localhost:5000`
- Check browser console (F12) for error messages
- Clear browser cache and localStorage if needed:
  ```javascript
  localStorage.clear()
  ```

### Canvas Editor Not Working
- Ensure JavaScript is enabled in browser
- Try refreshing the page
- Check browser console for errors
- Make sure you're on a modern browser (Chrome, Firefox, Safari, Edge)

## 📊 Database Schema

### Users Table
```
id (int, PK)
username (string, unique)
email (string, unique)
passwordHash (string)
fullName (string)
role (enum: Admin, Manager, User, Guest)
avatar (string, optional)
status (enum: Active, Inactive)
isActive (bool)
createdAt (datetime)
updatedAt (datetime)
lastLoginAt (datetime)
```

### Projects Table
```
id (int, PK)
ownerId (int, FK → Users)
name (string)
description (string)
createdAt (datetime)
updatedAt (datetime)
```

### BlockSchemas Table
```
id (int, PK)
projectId (int, FK → Projects)
pageId (int, FK → Pages)
content (JSON string with blocks and connections)
createdAt (datetime)
updatedAt (datetime)
```

### AuditLogs Table
```
id (int, PK)
userId (int, FK → Users)
action (enum: CREATE, UPDATE, DELETE, LOGIN)
entityType (string)
entityId (int)
oldValue (JSON)
newValue (JSON)
createdAt (datetime)
```

## � Docker Deployment (Production-Ready)

### Quick Start with Docker

**One command to run everything:**

```bash
docker compose up --build
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- PostgreSQL: localhost:5432

### What's Included

✅ **Backend Container** (ASP.NET Core 9.0)
- Multi-stage build (optimized & secure)
- Health checks configured
- Automatic database migrations
- Logging to container stdout
- Environment variable configuration

✅ **Frontend Container** (React + Nginx)
- Production-optimized build
- Gzip compression enabled
- Security headers configured
- API proxy to backend
- WebSocket support for SignalR
- Client-side routing support

✅ **Database Container** (PostgreSQL 16)
- Persistent volume for data
- Health checks configured
- Automatic initialization
- Backup-ready setup

### Environment Configuration

Create `.env` file (or copy from `.env.example`):

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=standart_desk

# Backend JWT
JWT_KEY=your-256-bit-secret-key-generate-with-openssl
JWT_ISSUER=StandartDesk
JWT_AUDIENCE=StandartDeskUsers

# URLs
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:5000

# Ports
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

**Generate secure JWT key:**
```bash
openssl rand -base64 64
```

### Makefile Commands

Helpful shortcuts for Docker operations:

```bash
make help                 # Show all commands
make build              # Build images
make up                 # Start services
make down               # Stop services
make restart            # Restart services
make logs               # View all logs
make logs-backend       # View backend logs only
make ps                 # Show running containers
make clean              # Remove containers & volumes
make shell-backend      # Open shell in backend
make shell-postgres     # Open postgres prompt
make test               # Run tests
make status             # Check service health
```

### Scaling & Monitoring

**View service status:**
```bash
docker compose ps
```

**Check health endpoints:**
```bash
curl http://localhost:5000/health
curl http://localhost:3000/
```

**View logs:**
```bash
docker compose logs -f backend      # Backend logs
docker compose logs -f frontend     # Frontend logs
docker compose logs -f postgres     # Database logs
```

**One-command reset:**
```bash
docker compose down -v && docker compose up --build
```

### Production Deployment

For production deployment:

1. **Generate secure JWT key:**
   ```bash
   openssl rand -base64 64
   ```

2. **Update .env with production values:**
   ```env
   JWT_KEY=<generated-key>
   POSTGRES_PASSWORD=<strong-password>
   FRONTEND_URL=https://yourdomain.com
   VITE_API_URL=https://api.yourdomain.com
   ```

3. **Enable HTTPS:**
   - Use reverse proxy (nginx, traefik)
   - Or use AWS ALB, Azure Load Balancer
   - SSL/TLS termination recommended

4. **Database backup:**
   ```bash
   docker compose exec postgres pg_dump -U postgres standart_desk > backup.sql
   ```

5. **Restore from backup:**
   ```bash
   docker compose exec -T postgres psql -U postgres standart_desk < backup.sql
   ```

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐         ┌──────────────┐         │
│  │  Frontend    │         │   Backend    │         │
│  │  (Nginx)     │◄────────┤  (ASP.NET)   │         │
│  │  :3000       │  API    │  :80         │         │
│  └──────────────┘  Proxy  └──────────────┘         │
│        │                          │                 │
│        └──────────────┬───────────┘                 │
│                       │                             │
│                ┌──────▼────────┐                    │
│                │  PostgreSQL   │                    │
│                │  Database     │                    │
│                │  :5432        │                    │
│                └───────────────┘                    │
│                 (Persistent Vol)                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Ready

- ✅ Production-ready code
- ✅ Comprehensive error handling
- ✅ Proper HTTP status codes
- ✅ CORS configuration
- ✅ Secure password handling
- ✅ Database migrations
- ✅ Logging and monitoring
- ✅ Responsive design
- ✅ Clean UI/UX
- ✅ Full audit trail
- ✅ Docker containerization
- ✅ One-command deployment

## 📝 Notes

- Admin account is created automatically on first backend run
- Check terminal output for admin credentials
- All passwords are hashed with salt
- All user actions are logged in audit trail
- Canvas diagrams are stored as JSON
- Database file: `standart-desk.db`

---

**Version**: 2.0  
**Last Updated**: February 18, 2026  
**Status**: ✅ Production Ready  
**License**: MIT

