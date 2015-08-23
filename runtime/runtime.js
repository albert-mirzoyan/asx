function inherits(child, parent) {
    if (typeof parent !== 'function' && parent !== null) {
        throw new TypeError('Super expression must either be null or a function, not ' + typeof parent);
    }
    child.prototype = Object.create(parent && parent.prototype, {
        constructor: {
            value           : child,
            enumerable      : false,
            writable        : true,
            configurable    : true
        }
    });
    if (parent) {
        child.__proto__ = parent;
    }
}
function decorate(target,name,descriptor){
    var member = descriptor.value;
    if(member.decorators){
        console.info('DECORATE WITH',member.decorators);
    }
    switch(member.kind){
        case 'field':
            descriptor.value = member.call(target);
        break;
    }
    return descriptor;
}

function getProjectId(path){
    return path.split('/')[0];
}
function getProjectName(path){
    return getProjectId(path).split('@')[0];
}
function getProjectVersion(path){
    return getProjectId(path).split('@')[1];
}
function getModuleName(path){
    path = path.split('/');
    path.shift();
    return path.join('/')
}

function convertClass(def){
    var clazz = null;
    def(def=>{
        var IC = def['.constructor'];
        delete def['.constructor'];
        clazz = IC.F;
        Object.defineProperties(clazz,{
            decorators  : {value:IC.A}
        });
        Object.keys(def).forEach(key=>{
            var member = convertClassMember(key,def);
            var container = member.static ? clazz:clazz.prototype;
            Object.defineProperty(container,member.name,{
                configurable : true,
                get : function(){
                    return Object.defineProperty(this,member.name,decorate(this,member.name,{
                        value : member
                    }))[member.name];
                }
            });
        });
    });
    return clazz;
}
function convertClassMember(key,def){
    var member = def[key];
    var decors = member.A;
    var kind = 'unknown';
    var name = key.substring(1);
    var isStatic = key[0]==':';
    if(typeof member =='function'){
        kind = 'class';
        member = convertClass.bind(this)(member)
    }else
    if(typeof member =='object'){
        if (member.F) {
            member = member.F;
            kind = 'method';
        } else
        if(member.V){
            member = member.V;
            kind = 'field';
        }
    } else {
        console.info('UNKNOWN MEMBER TYPE');
    }
    Object.defineProperties(member,{
        name        : {value:name},
        static      : {value:isStatic},
        kind        : {value:kind},
        module      : {value:this},
        decorators  : {value:decors}
    });
    delete def[key];
    return member;
}
function convertModule(){
    this.scope={};
    this.definition=this.definition.bind(this.scope);
    this.definition(def=>{
        this.default = def.default;
        delete def.default;
        Object.keys(def).forEach(key=>{
            var member = convertModuleMember.bind(this)(key,def);
            Object.defineProperty(this.scope,member.name,{
                configurable : true,
                get : function(){
                    return Object.defineProperty(this,member.name,decorate(this,member.name,{
                        value : member
                    }))[member.name];
                }
            })
        });
        return Runtime;
    });
    console.info(this.scope)
}
function convertModuleMember(key,def){
    var member = def[key];
    var decors = member.A;
    var kind = 'unknown';
    if(typeof member =='function'){
        kind = 'class';
        member = convertClass(member)
    }else
    if(typeof member =='object'){
        if (member.F) {
            member = member.F;
            kind = 'method';
        } else
        if(member.V){
            member = member.V;
            kind = 'field';
        }
        Object.defineProperties(member,{
            name        : {value:key},
            kind        : {value:kind},
            module      : {value:this},
            decorators  : {value:decors}
        });
    } else {
        console.info('UNKNOWN MEMBER TYPE');
    }

    delete def[key];
    return member;
}

function onModuleComplete(r){
    convertModule.bind(this)();
    Object.keys(this.exports).forEach(key=>{
        if(key=='default'){
            Object.defineProperty(this.exports,key,{
                get : this.default
            });
            delete this.default;
        }else{
            var exported = this.exports[key];
            var local = exported;
            if(local == '*'){
                local = key;
            }
            Object.defineProperty(this.exports,local,{
                configurable:true,
                get:function(){
                    return Object.defineProperty(this.exports,local,{
                        value : this.scope[local]
                    })[local];
                }
            });
        }
    });
    console.info('INITIALIZE MODULE');
    delete this.pending;
    return this.exports;
}
function onModuleFailure(e){
    console.error(e);
    throw e;
}

function onProjectComplete(r){
    this.id = r.name+'@'+r.version;
    this.name = r.name;
    this.version = r.version;
    this.modules = {};
    Object.keys(r.modules).forEach(id=>{
        this.modules[id] = new Module(this,id,r.modules[id]);
    });
    delete this.pending;
    return this;
}
function onProjectFailure(r){
    console.info(r);
    return this;
}

class Project {
    static get versions():Object {
        return Object.defineProperty(this, 'versions', {
            value: {}
        }).versions
    }
    static get projects():Object {
        return Object.defineProperty(this, 'projects', {
            value: {}
        }).projects
    }
    static get(id):Project {
        var name = getProjectName(id);
        var project = Project.projects[name];
        if (!project) {
            project = Object.defineProperty(Project.projects, name, {
                value : new Project(id)
            })[name];
        }
        return project;
    }
    static load(id):Project {
        return Project.get(id).load();
    }
    constructor(id){
        this.name = getProjectName(id);
        this.version = getProjectVersion(id);
        this.pending = true;
    }
    load(){
        if(this.pending){
            var promise;
            if(this.version){
                promise = Promise.resolve(this.version)
            }else{
                if(Project.versions[this.name]){
                    promise = Promise.resolve(Project.versions[this.name])
                }else{
                    promise = Loader.loadJson(this.name+'/project.json')
                }
                promise = promise.then(r=>{
                    Project.versions[this.name] = r;
                    this.version = r.latest;
                    this.id = this.name+'@'+this.version;
                    return this.version;
                })
            }
            return promise.then(v=>{
                return Loader.loadJson(this.name+'/'+this.version+'/package.json')
                    .then(onProjectComplete.bind(this))
                    .catch(onProjectFailure.bind(this))
            });
        }else{
            return Promise.resolve(this);
        }
    }
    module(name){
        return this.modules[name];
    }
}
class Module {
    static get modules():Object {
        return Object.defineProperty(this, 'modules', {
            value: {}
        }).modules
    }
    static load(id){
        return Project.load(getProjectId(id)).then(project=>{
            return project.module(getModuleName(id)).load();
        })
    }
    static get(id):Module {
        var module = Module.modules[id];
        if (!module) {
            module = Object.defineProperty(Module.modules, id, {
                value : new Module(id)
            })[id];
        }
        return module;
    }
    static define(id, definition) {
        Project.get(getProjectName(id)).module(getModuleName(id)).definition=definition;
    }
    constructor(project,name,config) {
        this.id = project.id+'/'+name;
        this.project = project;
        this.name = name;
        this.path = project.name+'/'+project.version+'/'+name;
        this.exports = config.exports;
        this.imports = config.imports;
        this.proxies = config.proxies;
        this.pending = true;
    }
    load() {
        if(this.pending){
            return Loader.load(this.path)
                .then(onModuleComplete.bind(this))
                .catch(onModuleFailure.bind(this));
        }else{
            return Promise.resolve(this.exports);
        }
    }
}
class Loader {
    static get repository() {
        return Object.defineProperty(this, 'repository', {
            value: (()=> {
                switch (Runtime.platform) {
                    case Runtime.PLATFORM.NODE     :
                        return Loader.dirname(__filename);
                    case Runtime.PLATFORM.BROWSER  :
                        return Loader.dirname(document.querySelector('script[main]').src);
                }
            })()
        }).repository
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
    static loadJson(path){
        return Loader.loadText(path).then(r=>JSON.parse(r));
    }
    static loadText(path){
        var url = Loader.resolve(Loader.repository, path);
        function loadBrowser(url) {
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
        switch (Runtime.platform) {
            case Runtime.PLATFORM.NODE:
                return loadBrowser(url);
                break;
            case Runtime.PLATFORM.BROWSER:
                return loadBrowser(url);
                break;
        }
    }
    static load(path) {
        var url = Loader.resolve(Loader.repository, path + '.js');
        function loadScript(url) {
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
        switch (Runtime.platform) {
            case Runtime.PLATFORM.NODE:
                return loadScript(url);
                break;
            case Runtime.PLATFORM.BROWSER:
                return loadScript(url);
                break;
        }
    }
}
class Runtime {
    static PLATFORM = {
        NODE: 'node',
        BROWSER: 'browser'
    };
    static get global():Object {
        return Object.defineProperty(this, 'global', {
            value: (()=> {
                if (typeof process != 'undefined') {
                    return global;
                }
                if (typeof window != 'undefined') {
                    return window;
                }
            })()
        }).global
    }
    static get platform():String {
        return Object.defineProperty(this, 'platform', {
            value: (()=> {
                if (typeof process != 'undefined') {
                    return Runtime.PLATFORM.NODE;
                }
                if (typeof window != 'undefined') {
                    return Runtime.PLATFORM.BROWSER;
                }
            })()
        }).platform
    }
    static get executable():String {
        return Object.defineProperty(this, 'executable', {
            value: (()=> {
                switch (this.platform) {
                    case Runtime.PLATFORM.NODE     :
                        return process.argv[2];
                    case Runtime.PLATFORM.BROWSER  :
                        var mainScript = document.querySelector('script[main]');
                        if (mainScript) {
                            return mainScript.getAttribute('main');
                        }
                }
            })()
        }).executable;
    }
    static execute() {
        Runtime.global.Module = Module;
        Runtime.global.Project = Project;
        if (this.executable) {
            Module.load(this.executable).then(module=> {
                console.info(module.default);
            });
        }
    }
}

Runtime.execute();


