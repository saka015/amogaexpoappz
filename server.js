#!/usr/bin/env node
const instrumentation = require('./instrumentation');

const path = require('path');
const { createRequestHandler } = require('@expo/server/adapter/express');

const express = require('express');
const compression = require('compression');
const morgan = require('morgan');

const CLIENT_BUILD_DIR = path.join(process.cwd(), 'dist/client');
const SERVER_BUILD_DIR = path.join(process.cwd(), 'dist/server');

const app = express();
app.use(compression());

// Security best practices
app.disable('x-powered-by');

process.env.NODE_ENV = 'production';

// Serve static files
app.use(
  express.static(CLIENT_BUILD_DIR, {
    maxAge: '1h',
    extensions: ['html'],
  })
);

// Logging
app.use(morgan('tiny'));

// All requests go through Expo handler
app.all(
  '/{*all}',
  createRequestHandler({
    build: SERVER_BUILD_DIR,
  })
);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 Express server listening on port ${port}`);
});
