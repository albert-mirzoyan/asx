#!/usr/bin/env node
process.title = 'asxc';
process.argv.splice(2,0,'asx-compiler/cli');
require('../out/runtime');
