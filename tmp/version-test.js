import Version from './version';

var v1 = new Version('1.2.1');
var v2 = new Version('1.2.0');

console.info(v1,v2,v1.compare(v2));