# 🚀 StandartHelper - Professional Block Diagram Designer with Audit Logging

A production-ready web application for creating and managing block diagrams with comprehensive audit logging, user management, role-based access control, and professional features.

## ✨ Features

### 🎨 Advanced Canvas Editor
- **Full block diagram support**: Processes, decisions, start/end nodes, data elements
- **Drag-and-drop interface**: Move blocks freely like Visio
- **Connect blocks**: Create connections between shapes with automatic arrows
- **Color customization**: Fill blocks with any color
- **Text editing**: Write and edit text inside blocks
- **Zoom & Pan**: Navigate large diagrams seamlessly
- **Grid-based**: Snap to grid for precise positioning

### 🔐 Complete Authentication System
- PBKDF2-SHA256 password hashing with salt
- Role-based access control (Admin, Manager, User, Guest)
- Token-based authentication
- Session persistence with localStorage
- Beautiful, clean login page
- Default admin account automatically created

### 👥 User Management
- Create users with role assignment
- User status management (Active/Inactive)
- Avatar support
- User settings & preferences
- View all users in admin dashboard
- Delete user accounts

### 📊 Comprehensive Audit Logging
- **All actions tracked**: CREATE, UPDATE, DELETE, LOGIN
- **Detailed change tracking**: Old values → New values
- **Searchable logs**: Find audit records easily
- **Pagination support**: Browse through audit history
- **Immutable audit trail**: All changes permanently recorded

### ⚙️ User Settings
- **Theme selection**: Dark/Light mode
- **Avatar upload**: Custom user avatars
- **Status setting**: Active/Inactive status
- **Preferences**: Personalized settings

### 📁 Project Management
- Create projects with descriptions
- Visual project cards
- Open and edit projects
- Delete projects with confirmation
- Project ownership tracking

### 🛡️ Security & Authorization
- Authorization checks on all admin endpoints
- 401 Unauthorized for missing authentication
- 403 Forbidden for insufficient permissions
- CORS configured
- Secure password handling

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

