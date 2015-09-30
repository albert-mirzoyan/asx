var config  = require('./package.json');
var cli     = require('./lib/cli');
cli.default.exec(config,process.argv);