#!/usr/bin/env node

import { runServer } from '../src/index.js';

runServer().catch((error) => {
  console.error('Fatal error starting Adplat Admin MCP server:', error);
  process.exit(1);
});
