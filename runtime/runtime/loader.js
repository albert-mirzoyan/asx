import {System} from './system';
import {Platform} from './system';
import {Url} from './utils/url';

export class Loader {

    static getProject(uri){
        return uri.split('/')[0].split('@')[0];
    }
    static getVersion(uri){
        return uri.split('/')[0].split('@')[1];
    }
    static getModule(uri){
        uri = uri.split('/');
        uri.shift();
        return uri.join('/');
    }
    static filename(path:String) {
        return path.split(Path.SEP).pop();
    }
    static dirname(path) {
        path = path.split('/');
        path.pop();
        path = path.join('/');
        return path;
    }
    static normalize(path) {
        if (!path || path === '/') {
            return '/';
        }
        var prepend = (path[0] == '/' || path[0] == '.');
        var target = [], src, scheme, parts, token;
        if (path.indexOf('://') > 0) {
            parts = path.split('://');
            scheme = parts[0];
            src = parts[1].split('/');
        } else {
            src = path.split('/');
        }
        for (var i = 0; i < src.length; ++i) {
            token = src[i];
            if (token === '..') {
                target.pop();
            } else if (token !== '' && token !== '.') {
                target.push(token);
            }
        }
        return (
            (scheme ? scheme + '://' : '') +
            (prepend ? '/' : '') +
            target.join('/').replace(/[\/]{2,}/g, '/')
        );
    }
    static resolve(...paths) {
        var current = paths.shift();
        paths.forEach(path=> {
            if (path[0] == '/') {
                current = path;
            } else {
                current = Loader.normalize(current + '/' + path)
            }
        });
        return current;
    }

    system      : System;
    executable  : String;
    repository  : String;
    projects    : Object;

    constructor(system){
        this.system = system;
        this.projects = {};
        this.modules  = {};
    }
    resolve(uri){
        if(this.modules[uri]){
            return uri;
        }else{
            var project = Loader.getProject(uri);
            var version = Loader.getVersion(uri);
            if(!version){
                if(!this.projects[project]){
                    return false;
                }else{
                    version = this.projects[project].latest;
                }
            }
            var module  = Loader.getModule(uri);
            if(!module){
                module = this.projects[project][version].main || 'index';
            }
            return project+'@'+version+'/'+module;
        }
    }
    module(uri){
        if(!this.modules[uri]){
            uri = this.resolve(uri);
        }
        var module = this.modules[uri];
        if(module && module[MIRROR]){
            if(typeof module[MIRROR].initialize=='function'){
                module[MIRROR].initialize();
            }
        }
        return module;
    }
    define(uri,exports){
        var project,version,module;
        project = Loader.getProject(uri);
        if(!this.projects[project]){
            project = this.projects[project] = {
                name    : project,
                latest  : version = Loader.getVersion(uri) || '0.0.1',
                main    : 'index'
            }
        }
        return project[Loader.getModule(uri)||'index']=exports;
    }
    import(uri=this.executable){
        var module = this.module(uri);
        if(module){
            return Promise.resolve(module);
        }else{
            return this.load(uri).then(m=>{
                return m.initialize();
            });
        }
    }
    load(uri=this.executable){
        var loadProject = ()=>{
            var projectId = Loader.getProject(uri);
            if(!projectId){
                throw new Error(`Invalid project URI '${uri}'`);
            }
            var project = this.projects[projectId];
            if (project) {
                return project;
            }else{
                project = this.projects[projectId] = {
                    name : projectId
                };
                return this.loadJson(Loader.resolve(this.repository,projectId,'project.json')).then(p=>{
                    for(var key in p){
                        project[key] = p[key];
                    }
                    return project;
                })
            }
        };
        var loadLibrary = (project)=>{
            var version = Loader.getVersion(uri) || project.latest;
            var library = project[version];
            if(typeof library == 'object'){
                return library;
            }else{
                library = project[version] = {
                    project : project.name,
                    version : version
                };
                return this.loadJson(Loader.resolve(this.repository,project.name,version,'package.json')).then(l=> {
                    for(var key in l){
                        library[key] = l[key];
                    }
                    return library;
                })
            }
        };
        var loadModule  = (library)=>{
            var moduleId = Loader.getModule(uri) || library.main || 'index';
            var module = library.modules[moduleId];

            module.uri = library.name+'@'+library.version+'/'+moduleId;
            module.url = Loader.resolve(this.repository,library.name,library.version,moduleId+'.js');
            var dependencies = [];
            if(module.imports && !module.imports.resolved){
                Object.defineProperty(module.imports,'resolved',{value:true});
                dependencies = dependencies.concat(Object.keys(module.imports).map(d=>this.load(d).then(m=>{
                    module.imports[m.uri] = module.imports[d];
                    delete module.imports[d];
                })));
            }
            if(module.exports && !module.exports.resolved){
                Object.defineProperty(module.exports,'resolved',{value:true});
                dependencies = dependencies.concat(Object.keys(module.exports).map(d=>this.load(d).then(m=>{
                    module.exports[m.uri] = module.exports[d];
                    delete module.exports[d];
                })));
            }
            if(dependencies.length){
                return Promise.all(dependencies).then(r=>{
                    return module;
                })
            }else{
                return module;
            }

        };
        var loadScript  = (module)=>{
            if(module.pending || module.source){
                return module;
            }else{
                module.pending = true;
                return this.loadText(Loader.resolve(module.url)).then(l=>{
                    module.source = l;
                    delete module.pending;
                    return this.modules[module.uri] = module;
                })
            }
        };
        return Promise.resolve().then(loadProject).then(loadLibrary).then(loadModule).then(loadScript).then(m=>{
            if(!m.pending && m.source){
                this.evaluate(m.uri)
            }
            return m;
        });
    }
    evaluate(uri){
        throw new Error('Loader.execute is abstract method');
    }
    loadJson(path){
        return this.loadText(path).then(r=>JSON.parse(r));
    }
    loadText(path){
        throw new Error('Loader.loadText is abstract method');
    }
    loadScript(path) {
        throw new Error('Loader.loadScript is abstract method');
    }
}

export class NodeLoader extends Loader {
    get repository() {
        return Object.defineProperty(this, 'repository', {
            value: Loader.dirname(__filename)
        }).repository
    }
    get executable(){
        return Object.defineProperty(this,'executable',{
            enumerable      : true,
            configurable    : false,
            writable        : false,
            value           : process.argv[2]
        }).executable;
    }
    loadText(path){
        throw new Error('NodeLoader.loadText method not implemented');
    }
    loadScript(path) {
        throw new Error('NodeLoader.loadScript method not implemented');
    }
}
export class BrowserLoader extends Loader {
    get repository() {
        return Object.defineProperty(this, 'repository', {
            value: Loader.dirname(document.querySelector('script[main]').src)
        }).repository
    }
    get executable(){
        return Object.defineProperty(this,'executable',{
            enumerable      : true,
            configurable    : false,
            writable        : false,
            value           : (()=>{
                var mainScript = document.querySelector('script[main]');
                if (mainScript) {
                    mainScript = mainScript.getAttribute('main');
                }
                return mainScript;
            })()
        }).executable;
    }
    loadText(url){
        return new Promise((accept, reject)=> {
            var oReq = new XMLHttpRequest();
            oReq.addEventListener('load', e=>{
                accept(e.target.responseText);
            });
            oReq.addEventListener("error", e=>{
                reject(e)
            });
            oReq.open("get", url, true);
            oReq.send();
        });
    }
    loadScript(url) {
        return new Promise((accept, reject)=> {
            try {
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.onload = accept;
                script.onerror = reject;
                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);
            }catch(ex){
                reject(ex);
            }
        });
    }
    evaluate(uri){
        var module = this.module(uri);
        var script = document.createElement("script");
        script.id = module.uri;
        script.type = "text/javascript";
        script.text = module.source+'\n//# sourceURL='+module.url;
        document.getElementsByTagName("head")[0].appendChild(script);
        return module;
    }
}