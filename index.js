var Module = require("module");
var _resolveFilename = Module._resolveFilename;
var babel = {}, external = {};
var babelPrefix = '/Users/Sergey/Work/EXP/asx/lib/';
var babelSrcPrefix = '/Users/Sergey/Work/EXP/asx/src/';
var externalPrefix = '/Users/Sergey/Work/EXP/asx/node_modules/';
Module._resolveFilename = function(request, parent) {
    var filename = _resolveFilename.call(Module,request, parent);
    if(filename.indexOf(babelPrefix)==0){
        babel[filename.replace(babelPrefix,'')] = true;
    }else
    if(filename.indexOf(externalPrefix)==0){
        var path = filename.replace(externalPrefix,'').split('/');
        external[path.shift()] = parent.id;
    }
    return filename;
};
require('./lib/compiler');
Module._resolveFilename =_resolveFilename;

var FS = require('fs');
var PATH = require('path');
var pack = require('./package.json');
function readDirRecursive(dir) {
    var items = FS.readdirSync(dir).map(function(s){
        return PATH.resolve(dir,s);
    });
    var files=[],dirs=[];
    items.forEach(function(f){
        if(FS.statSync(f).isDirectory()){
            dirs.push(f);
        }else{
            files.push(f);
        }
    });
    dirs.forEach(function(d){
        files = files.concat(readDirRecursive(d));
    });
    return files;
}
readDirRecursive('./src').forEach(function(p){
    p =p.replace(babelSrcPrefix,'');
    if(!babel[p]){
        if(p.indexOf('transformation/templates')<0){
            var ourFile = PATH.resolve(babelPrefix,p);
            if(FS.existsSync(ourFile)) {
                console.info('DELETE ', ourFile);
                FS.unlinkSync(ourFile);
            }
            var srcFile = PATH.resolve(babelSrcPrefix,p);
            if(FS.existsSync(srcFile)){
                console.info('DELETE ',srcFile);
                FS.unlinkSync(srcFile);
            }
        }else{
            console.info('TEMPLATE ',p);
        }
    }
});
for(var i in pack.dependencies){
    if(!external[i]){
        console.info('UNUSED',i)
    }
}
console.info(external)