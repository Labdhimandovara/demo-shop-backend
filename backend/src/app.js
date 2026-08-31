require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');
const ordersRouter = require('./routes/orders');

const app = express();

// --- CORS (whitelisted origins) ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no Origin header) and whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

app.options('*', cors()); // Handle preflight for all routes

// --- Body parser ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Swagger / OpenAPI ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Demo Shop API',
      version: '1.0.0',
      description: 'A full-featured shopping REST API with JWT authentication. Use POST /api/auth/login to get a bearer token, then click "Authorize" above.',
      contact: { name: 'Demo Shop' },
    },
    servers: [
      { url: process.env.API_BASE_URL || 'http://localhost:4000', description: 'Active server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/openapi.json', (req, res) => res.json(swaggerSpec));

// --- Routes ---
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'demo-shop-api' });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, data: null });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error(err);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin not allowed', data: null });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found', data: null });
  }
  res.status(500).json({ error: err.message || 'Internal server error', data: null });
});

module.exports = app;
