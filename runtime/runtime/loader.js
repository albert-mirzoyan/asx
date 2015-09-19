import {Platform} from './mirrors';
import {Url} from './utils/url';

export class Loader {

    static getProject(uri){
        var parts = uri.split('/')[0];
        return parts.split('@')[0];
    }
    static getVersion(uri){
        var parts = uri.split('/')[0];
        var version = 'latest';
        if(parts.length>1){
            version = parts.split('@')[1] || version;
        }
        return version;
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
    module(uri){
        var module = this.modules[uri];
        if(!module){
            var pid = Loader.getProject(uri);
            var vid = Loader.getVersion(uri);
            var mid = Loader.getModule(uri);
            var project = this.projects[pid];
            if(project){
                if(vid=='latest'){
                    vid = project.latest;
                }
                project = project[vid];
                if(!mid){
                    mid = project.main || 'index';
                }
                module = this.modules[uri] = project.modules[mid];
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
    load(uri=this.executable){
        var modules = {};
        var loadProjectVersions = (uri)=>{
            var pid = Loader.getProject(uri);
            if(!pid){
                throw new Error(`Invalid project URI '${uri}'`);
            }
            var project = this.projects[pid];
            if (!project) {
                project = this.projects[pid] = {
                    pending : true,
                    name    : pid,
                    url     : Loader.resolve(this.repository,pid,'project.json')
                };
            }
            if(project.pending && !project.loading){
                project.loading = true;
                return this.loadJson(project.url).then(patch=>{
                    delete project.pending;
                    delete project.loading;
                    for(var key in patch){
                        project[key] = patch[key];
                    }
                    return project;
                })
            }else{
                return Promise.resolve(project)
            }
        };
        var loadProjectInstance = (uri)=>{
            return loadProjectVersions(uri).then(versions=>{
                var vid = Loader.getVersion(uri);
                if(vid=='latest'){
                    vid =  versions.latest;
                }
                var project = versions[vid];
                if (!project) {
                    project = versions[vid] = {
                        pending : true,
                        name    : versions.name,
                        url     : Loader.resolve(this.repository,versions.name,vid,'package.json')
                    };
                }
                if(project.pending && !project.loading){
                    project.loading = true;
                    return this.loadJson(project.url).then(patch=>{
                        delete project.pending;
                        delete project.loading;
                        for(var key in patch){
                            project[key] = patch[key];
                        }
                        for(var mid in project.modules){
                            var module = project.modules[mid];
                            module.pending = true;
                            module.uri = project.name+'@'+project.version+'/'+mid;
                            module.url = Loader.resolve(this.repository,project.name,project.version,mid+'.js');
                            module.dependencies = {};
                            for(var iid in module.imports){
                                module.dependencies[iid]={
                                    pending : true
                                };
                            }
                            for(var eid in module.exports){
                                module.dependencies[eid]={
                                    pending : true
                                };
                            }
                        }
                        return project;
                    })
                }else{
                    return Promise.resolve(project)
                }
            });
        };
        var loadProjectModule   = (uri)=>{
            return loadProjectInstance(uri).then(project=>{
                var mid = Loader.getModule(uri) || project.main || 'index';
                var module = project.modules[mid];
                if(module.pending && !module.loading){
                    module.loading = true;
                    return this.loadText(module.url).then(source=>{
                        delete module.pending;
                        delete module.loading;
                        module.source = source;
                        return module;
                    })
                }else{
                    return Promise.resolve(module)
                }
            }).then(m=>this.evaluate(m))
        };
        var loadModule          = (uri)=>{
            return loadProjectModule(uri).then(module=>{
                return Promise.all(Object.keys(module.dependencies).map(did=>{
                    var dependency = module.dependencies[did];
                    if(dependency.pending && !dependency.loading){
                        dependency.loading = true;
                        return loadModule(did).then(m=>{
                            delete dependency.pending;
                            delete dependency.loading;
                            //module.dependencies[m.uri] = m;

                            m.parent = module;
                            if(module.imports[did]){
                                var imports = module.imports[did];
                                module.imports[m.uri] = imports;
                                delete module.imports[did];
                            }
                            if(module.exports[did]){
                                var exports = module.exports[did];
                                module.exports[m.uri] = exports;
                                delete module.exports[did];
                            }
                            return m;
                        });
                    }
                }).filter(i=>!!i)).then(dps=>modules[module.uri] = module);
            });
        };
        return loadModule(uri).then(m=>{
            setTimeout(()=>{
                for(var i in modules){
                    i = this.system.modules[i];
                }
            });
            return this.system.modules[m.uri];
        })
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
    evaluate(module){
        if(!module.evaluated){
            module.evaluated = true;
            console.info("EVALUATE",module.uri);
            var script = document.createElement("script");
            script.id = module.uri;
            script.type = "text/javascript";
            script.text = module.source+'\n//# sourceURL='+module.url;
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        return module;
    }
}