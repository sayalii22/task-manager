// Handle 404 for API routes
const notFound = (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  }
  next();
};

// Global Centralized Error Handler
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle PostgreSQL / Supabase Unique Constraint Violation (23505)
  if (err.code === '23505') {
    statusCode = 400;
    message = 'Duplicate field value entered. A record with this unique value already exists.';
  }

  // Handle PostgreSQL Invalid Input Syntax / Bad UUID (22P02)
  if (err.code === '22P02') {
    statusCode = 404;
    message = 'Resource not found: invalid ID format';
  }

  // Handle PostgreSQL Foreign Key Violation (23503)
  if (err.code === '23503') {
    statusCode = 400;
    message = 'Invalid reference: referenced entity does not exist.';
  }

  // Handle Supabase PostgREST Not Found (PGRST116)
  if (err.code === 'PGRST116') {
    statusCode = 404;
    message = 'Resource not found.';
  }

  // Handle JWT Error
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }

  // Handle JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please login again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
