import express from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/error';

// Route imports
import authRouter from './routes/auth';
import propertiesRouter from './routes/properties';
import landsRouter from './routes/lands';
import inquiriesRouter from './routes/inquiries';
import saleRequestsRouter from './routes/saleRequests';
import preferencesRouter from './routes/preferences';
import usersRouter from './routes/users';
import employeesRouter from './routes/employees';
import roomsRouter from './routes/rooms';
import tenantsRouter from './routes/tenants';
import schedulesRouter from './routes/schedules';
import chatsRouter from './routes/chats';

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/properties', propertiesRouter);
app.use('/api/v1/lands', landsRouter);
app.use('/api/v1/inquiries', inquiriesRouter);
app.use('/api/v1/sale-requests', saleRequestsRouter);
app.use('/api/v1/preferences', preferencesRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/employees', employeesRouter);
app.use('/api/v1', roomsRouter);
app.use('/api/v1', tenantsRouter);
app.use('/api/v1', schedulesRouter);
app.use('/api/v1/chats', chatsRouter);

// ─── Error Handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
