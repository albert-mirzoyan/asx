import FS from 'fs';
import PATH from 'path';

export class Files {
  static resolve(...args){
    return PATH.resolve(...args);
  }
  static extname(path){
    return PATH.extname(path)
  }
  static extension(path){
    return this.extname(path).substring(1);
  }
  static relative(path,base){
    return PATH.relative(path,base);
  }
  static watch(path,options,listener){
    FS.watch(path,options,listener);
  }
  static dirname(path){
    return PATH.dirname(path);
  }
  static exists(path){
    return FS.existsSync(path);
  }
  static isFile(path){
    return (this.exists(path) && FS.statSync(path).isFile());
  }
  static isDirectory(path){
    return (this.exists(path) && FS.statSync(path).isDirectory());
  }
  static copyFile(source,target){
    this.writeFile(target, this.readFile(source,'binary'),'binary');
  }
  static readFile(path,enc){
    return FS.readFileSync(path,enc||'utf8');
  }
  static writeFile(path,data,enc){
    var dir = this.dirname(path);
    if(!this.isDirectory(dir)){
      this.makeDirRecursive(dir)
    }
    return FS.writeFileSync(path,data,enc||'utf8');
  }
  static readJson(path){
    return JSON.parse(this.readFile(path));
  }
  static makeDirRecursive(dir) {
    var parts = PATH.normalize(dir).split(PATH.sep);
    dir = '';
    for (var i = 0; i < parts.length; i++) {
      dir += parts[i] + PATH.sep;
      if (!FS.existsSync(dir)) {
        FS.mkdirSync(dir, 0x1FD);
      }
    }
  }
  static readDirRecursive(dir) {
    var items = FS.readdirSync(dir).map(s=>{
      return PATH.resolve(dir,s);
    });
    var files=[],dirs=[];
    items.forEach(f=>{
      if(FS.statSync(f).isDirectory()){
        dirs.push(f);
      }else{
        files.push(f);
      }
    });
    dirs.forEach(d=>{
      files = files.concat(Files.readDirRecursive(d));
    });
    return files;
  }
}
