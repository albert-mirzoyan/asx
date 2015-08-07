import transform from '../babel/transformation/index'
import {Files} from '../utils/files'
export class Project {
  static compile(config,sources){
    return new Project(config,sources).compile();
  }

  constructor(config,sources){
    this.config = config;
    this.sources = sources;
    this.dependencies={}
  }
  compile(){
    this.sources.forEach(s=>this.compileSource(s));
    Object.keys(this.dependencies).forEach(k=>{
      var v = this.dependencies[k];
      delete this.dependencies[k];
      k =('/'+k);
      this.dependencies[k.replace(/^(.*)\/index$/,'$1')] = v.map(f=>{
        if(f.charAt(0)=='.'){
          return Files.resolve(Files.dirname(k),(f).replace(/^(.*)\/index$/,'$1'))
        }else{
         return f;
        }
      })
    });
    return this;
  }

  compileSource(file){
    try{
      var result = transform(file.source,{
        code     : true,
        stage    : 0,
        filename : file.path,
        //sourceMap: 'inline',
        moduleId : [
          this.config.project,
          file.name
        ].join('/'),
        modules  : 'asx'
      });
      if(result.deps.length){
        this.dependencies[file.name]=result.deps;
      }
      file.output = result.code;
    }catch(ex){
      console.error(ex);
      console.error(ex.stack);
    }

  }

}
