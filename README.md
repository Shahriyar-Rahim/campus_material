# Campus Materials Portal

![Campus Materials Portal Screenshot](asset/screenshot.png)

A comprehensive campus materials management platform designed to streamline the sharing, organization, and access to educational resources. This full-stack application enables students and faculty to efficiently manage course materials, assignments, and collaborative content.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Material Management**: Upload, organize, and manage educational materials
- **Cloud Storage**: Cloudinary integration for efficient image and file storage
- **Real-time Updates**: WebSocket support via Socket.IO for live notifications and updates
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Database**: MongoDB integration for robust data persistence
- **Email Notifications**: Nodemailer integration for email communications
- **Responsive Design**: Modern, responsive UI built with React and Tailwind CSS
- **State Management**: Redux Toolkit for predictable state management
- **Drag & Drop**: Intuitive drag-and-drop interface powered by Hello Pangea DnD

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Redux Toolkit & Redux Persist
- **HTTP Client**: Axios
- **Routing**: React Router 7
- **Build Tool**: Vite 8
- **Real-time**: Socket.IO Client
- **UI Components**: Tailwind CSS utilities with Clsx
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT with bcryptjs
- **File Upload**: Multer
- **Cloud Storage**: Cloudinary
- **Real-time**: Socket.IO
- **Security**: Helmet, CORS, Rate Limiting
- **Email**: Nodemailer
- **Environment**: Dotenv
- **Database as a Service**: Supabase

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18.0.0 or higher)
- npm or yarn package manager
- MongoDB instance (local or cloud-based)
- Cloudinary account (for image/file storage)
- Supabase account (for database services)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Shahriyar-Rahim/campus_material.git
cd campus_material
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
cd ..
```

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_secret_key_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

## ▶️ Running the Application

### Development Mode

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
The backend server will start on `http://localhost:5000`

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```
The frontend application will start on `http://localhost:5173`

### Production Build

#### Backend
```bash
cd backend
npm start
```

#### Frontend
```bash
cd frontend
npm run build
npm run preview
```

## 📁 Project Structure

```
campus_material/
├── backend/
│   ├── src/
│   │   ├── server.js           # Main server entry point
│   │   ├── routes/             # API routes
│   │   ├── controllers/        # Route controllers
│   │   ├── models/             # Mongoose models
│   │   ├── middleware/         # Custom middleware
│   │   └── config/             # Configuration files
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   ├── pages/              # Page components
│   │   ├── redux/              # Redux store & slices
│   │   ├── utils/              # Utility functions
│   │   ├── App.jsx             # Main App component
│   │   └── main.jsx            # Entry point
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── asset/                      # Static assets & screenshots
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Materials Endpoints

- `GET /api/materials` - Get all materials
- `GET /api/materials/:id` - Get specific material
- `POST /api/materials` - Upload new material
- `PUT /api/materials/:id` - Update material
- `DELETE /api/materials/:id` - Delete material

For comprehensive API documentation, refer to your backend API documentation or OpenAPI/Swagger specification if available.

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure your code follows the project's coding standards and includes appropriate documentation.

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

**Author**: Shahriyar Rahim

For questions or support, please open an issue on the [GitHub repository](https://github.com/Shahriyar-Rahim/campus_material).
