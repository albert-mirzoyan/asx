import {Platform} from './mirrors';
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
    version     : String;
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
        var pid = Loader.getProject(uri);
        var vid = Loader.getVersion(uri);
        var mid = Loader.getModule(uri)  || 'index';
        var project,version,module;
        vid = vid=='latest'?this.version:vid;
        //console.info('STD',pid,vid,mid);
        if(!this.projects[pid]){
            project = this.projects[pid] = {
                name    : pid,
                latest  : vid
            }
        }else{
            project = this.projects[pid];
        }
        if(!project[vid]){
            project = project[vid] = {
                name    : pid,
                version : vid,
                main    : 'index',
                modules : {}
            }
        }else{
            project = project[vid]
        }
        if(!project.modules[mid]){
            module = project.modules[mid]={
                uri             : pid+'@'+vid+'/'+mid,
                evaluated       : true,
                dependencies    : {},
                exports         : {},
                imports         : {}
            };
            if(!exports.default){
                exports.default = exports;
            }
            this.system.module(module.uri,exports);
        }

        /*return project[Loader.getModule(uri)||'index']=exports;*/
    }
    setup(){}
    load(uri=this.executable){
        var modules = {};
        return this.loadModule(uri,modules).then(m=>{
            for(var i in modules){
                i = this.system.modules[i];
            }
            return this.system.modules[m.uri];
        })
    }
    loadProjectVersions(uri){

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
            project.promises = [];
            return this.loadJson(project.url).then(patch=>{
                delete project.pending;
                delete project.loading;
                for(var key in patch){
                    project[key] = patch[key];
                }
                return project;
            }).then(p=>{
                project.promises.forEach(promise=>{
                    promise.accept(p);
                });
                delete project.promises;
                return p;
            }).catch(e=>{
                project.promises.forEach(promise=>{
                    promise.reject(e);
                });
                delete project.promises;
                throw e;
            })
        }else
        if(project.loading){
            return new Promise((accept,reject)=>{
                project.promises.push({accept,reject});
            })
        }else{
            return Promise.resolve(project);
        }
    }
    loadProjectInstance(uri){
        return this.loadProjectVersions(uri).then(versions=>{
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
                project.promises = [];
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
                }).then(p=>{
                    project.promises.forEach(promise=>{
                        promise.accept(p);
                    });
                    delete project.promises;
                    return p;
                }).catch(e=>{
                    project.promises.forEach(promise=>{
                        promise.reject(e);
                    });
                    delete project.promises;
                    throw e;
                })
            } else
            if(project.loading){
                return new Promise((accept,reject)=>{
                    project.promises.push({accept,reject});
                })
            }else{
                return Promise.resolve(project)
            }
        });
    }
    loadProjectModule(uri){
        return this.loadProjectInstance(uri).then(project=>{
            var mid = Loader.getModule(uri) || project.main || 'index';
            var module = project.modules[mid];
            if(!module){
                console.info(mid)
            }
            if(module.pending && !module.loading){
                module.loading = true;
                module.promises = [];
                return this.loadText(module.url).then(source=>{
                    delete module.pending;
                    delete module.loading;
                    module.source = source;
                    return module;
                }).then(p=>{
                    module.promises.forEach(promise=>{
                        promise.accept(p);
                    });
                    delete module.promises;
                    return p;
                }).catch(e=>{
                    module.promises.forEach(promise=>{
                        promise.reject(e);
                    });
                    delete module.promises;
                    throw e;
                })
            }else
            if(project.loading){
                return new Promise((accept,reject)=>{
                    project.promises.push({accept,reject});
                })
            }else{
                return Promise.resolve(module)
            }
        }).then(m=>this.evaluate(m))
    }
    loadModule(uri,modules){
        return this.loadProjectModule(uri).then(module=>{
            return Promise.all(Object.keys(module.dependencies).map(did=>{
                var dependency = module.dependencies[did];
                if(dependency.pending && !dependency.loading){
                    dependency.loading = true;
                    return this.loadModule(did,modules).then(m=>{
                        delete dependency.pending;
                        delete dependency.loading;
                        //module.dependencies[m.uri] = m;
                        m.parent = module;
                        if(module.imports && module.imports[did]){
                            var imports = module.imports[did];
                            module.imports[m.uri] = imports;
                            delete module.imports[did];
                        }
                        if(module.exports && module.exports[did]){
                            var exports = module.exports[did];
                            module.exports[m.uri] = exports;
                            delete module.exports[did];
                        }
                        return m;
                    });
                }
            }).filter(i=>!!i)).then(dps=>modules[module.uri] = module);
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
    static MODULES = [
        'fs','http','https','path','url','vm',
        'query','buffer','child_process','assert',
        'crypto','dns','events','net','os','process',
        'punycode','querystring','stream','string_decoder',
        'readline','util','zlib'
    ];
    static get FS(){
        return Object.defineProperty(this, 'FS', {
            value: require('fs')
        }).FS
    }
    static get VM(){
        return Object.defineProperty(this, 'VM', {
            value: require('vm')
        }).VM
    }
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
    loadProjectInstance(uri){
        return super.loadProjectInstance(uri).then(project=>{
            if(project.cjs){
                project.cjs.forEach(name=>this.define(name,function(Asx){
                    Object.defineProperty(Asx,'exports',{
                        enumerable      : true,
                        configurable    : true,
                        get             : function(){
                            var imported = require(name);
                            if(!imported.default){
                                imported.default = imported;
                            }
                            imported[MIRROR] = Asx;
                            Object.defineProperty(Asx,'exports',{
                                enumerable      : true,
                                writable        : false,
                                configurable    : true,
                                value           : imported
                            });
                            return imported;
                        }
                    });
                }));
            }
            return project;
        })
    }
    setup(runtime){
        this.version = process.version;
        this.define('runtime',runtime);
        /*NodeLoader.MODULES.forEach(name=>this.define(name,function(Asx){
            Object.defineProperty(Asx,'exports',{
                enumerable      : true,
                configurable    : true,
                get             : function(){
                    var imported = require(name);
                    if(!imported.default){
                        imported.default = imported;
                    }
                    imported[MIRROR] = Asx;
                    Object.defineProperty(Asx,'exports',{
                        enumerable      : true,
                        writable        : false,
                        configurable    : true,
                        value           : imported
                    });
                    return imported;
                }
            });
        }));*/
    }
    loadText(path){
        return new Promise((accept, reject)=> {
            NodeLoader.FS.readFile(path, 'utf8', function (err, data) {
                if (err){
                    reject(err)
                }else{
                    accept(data)
                }
            });
        });
    }
    loadScript(path) {
        throw new Error('NodeLoader.loadScript method not implemented');
    }
    evaluate(module){
        NodeLoader.VM.runInNewContext(module.source,global,{
            filename : module.url
        });
        return module;
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
    setup(runtime){
        this.version = '0.0.1';
        this.define('runtime',runtime);
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
        if(!module.evaluated && module.source){
            module.evaluated = true;
            var script = document.createElement("script");
            script.id = module.uri;
            script.type = "text/javascript";
            script.text = module.source+'\n//# sourceURL='+module.url;
            document.getElementsByTagName("head")[0].appendChild(script);
        }
        return module;
    }
}