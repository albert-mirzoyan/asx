import transform from '../babel/transformation/index'
import {Files} from '../utils/files'

export class Project {
    static getProjectVersion(path){
        return this.getProjectId(path).split('@')[1];
    }
    static getProjectName(path){
        return this.getProjectId(path).split('@')[0];
    }
    static getProjectId(path){
        return path.split('/')[0];
    }
    static getModuleName(path){
        path = path.split('/');
        path.shift();
        return path.join('/')
    }

    static compile(config, sources) {
        return new Project(config, sources).compile();
    }
    get name(){
        return this.config.name;
    }
    get version(){
        return this.config.version;
    }
    get modules(){
        return this.config.modules;
    }
    get platforms(){
        return this.config.platforms;
    }
    constructor(config, sources) {
        this.config = config;
        this.config.modules = {};
        this.sources = sources;
        this.dependencies = {}
    }
    compile() {
        this.sources.forEach(s=>this.compileSource(s));
        Object.keys(this.dependencies).forEach(k=> {
            var v = this.dependencies[k];
            delete this.dependencies[k];
            k = ('/' + k);
            this.dependencies[k.replace(/^(.*)\/index$/, '$1')] = v.map(f=> {
                if (f.charAt(0) == '.') {
                    return Files.resolve(Files.dirname(k), (f).replace(/^(.*)\/index$/, '$1'))
                } else {
                    return f;
                }
            })
        });
        return this;
    }
    compileSource(file) {
        try {
            var result = transform(file.source, {
                project: this,
                code: true,
                stage: 0,
                filename: file.path,
                moduleId: this.name+'/'+file.name,
                modules: 'asx'
            });
            file.output = result.code;
        } catch (ex) {
            console.error(ex);
            console.error(ex.stack);
        }
    }
    module(id,config){
        this.config.modules[Project.getModuleName(id)] = config;
    }
    resolveModule(module,dependency){
        if(dependency[0]=='.'){
            var pid = Project.getProjectName(module);
            var mid = Project.getModuleName(module);
            return pid+'/'+Files.resolve('/'+Files.dirname(mid),dependency).substring(1)
        }else{
            return dependency;
        }
    }
    toJSON(){
        return {
            name        : this.name,
            version     : this.version,
            platforms   : this.platforms,
            modules     : this.modules,
            main        : this.config.main
        }
    }
}
