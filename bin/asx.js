#!/usr/bin/env node
process.title = process.argv.slice(2).join(' ');
require('../out/runtime');