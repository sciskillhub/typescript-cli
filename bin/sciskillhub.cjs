#!/usr/bin/env node
const { pathToFileURL } = require('url');
const path = require('path');

// Use dynamic import to load the ESM module
const distPath = pathToFileURL(path.join(__dirname, '../dist/index.js')).href;

import(distPath).catch(err => {
  console.error(err);
  process.exit(1);
});
