import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import { globalLimiter } from './middleware/rateLimiter.js';

const app = express();

app.use(helmet());

app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
));

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// global rate limiter ekhane
app.use("/api", globalLimiter);

// health check diba ekhane
app.get("/health", (req, res) =>
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
);

// api nroutes imports
import authRoutes from "./routes/auth.routes.js";
import materialRoutes from "./routes/materials.routes.js";
import plannerRoutes from "./routes/planner.routes.js";
import routineRoutes, { adminRouter } from "./routes/routine.routes.js";
import AppError from './utils/AppError.js';
import folderRoutes from "./routes/folders.routes.js";
import requestRoutes from "./routes/requests.routes.js";

// api routes ekhane
app.use("/api/auth",      authRoutes);
app.use("/api/routine",   routineRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/planner",   plannerRoutes);
app.use("/api/admin",     adminRouter);
app.use("/api/folders", folderRoutes);
app.use("/api/requests", requestRoutes);

// 404 handler ekhane

app.all(/(.*)/, (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    // Send a clean, structured JSON payload instead of an HTML page
    res.status(statusCode).json({
        status: status,
        message: err.message || 'An unexpected error occurred on the server.'
    });
});
export default app;