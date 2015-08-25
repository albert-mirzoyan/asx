class Helpers {
    static merge(a,b){
        var object = {};
        var aks = Object.getOwnPropertyNames(a);
        var bks = Object.getOwnPropertyNames(b);
        aks.forEach(ka=>{
            if(bks.indexOf(ka)<0){
                Object.defineProperty(object,ka,Object.getOwnPropertyDescriptor(a,ka));
            }
        });
        bks.forEach(kb=>{
            Object.defineProperty(object,kb,Object.getOwnPropertyDescriptor(b,kb));
        });
        return object;
    }
    static setPrototypeOf(instance,proto){
        instance.__proto__ = proto;
    }
    static inherits(child, parent) {
        if (typeof parent !== 'function' && parent !== null) {
            throw new TypeError('Super expression must either be null or a function, not ' + typeof parent);
        }
        child.prototype = Object.create(this.merge(parent && parent.prototype,child.prototype), {
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
    static getProjectId(path){
        return path.split('/')[0];
    }
    static getProjectName(path){
        return this.getProjectId(path).split('@')[0];
    }
    static getProjectVersion(path){
        return this.getProjectId(path).split('@')[1];
    }
    static getModuleName(path){
        path = path.split('/');
        path.shift();
        return path.join('/')
    }
    static convertClass(def){
        var clazz = null;
        def(def=>{
            var IC = def['.constructor'];
            delete def['.constructor'];
            clazz = IC.F;
            Metadata.set(clazz,{
                name        : clazz.name,
                module      : this,
                type        : 'class',
                decorators  : IC.A,
                module      : this
            });
            Object.keys(def).forEach(key=>{
                var member = Helpers.convertClassMember.bind(clazz)(key,def);
                var metadata = Metadata.get(member);
                var container = metadata.static ? clazz:clazz.prototype;
                Object.defineProperty(container,metadata.name,{
                    configurable    : true,
                    get             : function(){
                        return Object.defineProperty(this,metadata.name,Decorator.decorate(this,member))[metadata.name];
                    }
                });
            });
            return {
                super : function(target,args){
                    clazz.__proto__.apply(target,args);
                }
            }
        });
        return clazz;
    }
    static convertClassMember(key,def){
        var member = def[key];
        var decors = member.A;
        var kind = 'unknown';
        var name = key.substring(1);
        var isStatic = key[0]==':';
        if(typeof member =='function'){
            kind = 'class';
            member = Helpers.convertClass.bind(this)(member)
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
        Metadata.set(member,{
            name        : name,
            class       : this,
            type        : kind,
            decorators  : decors,
            static      : isStatic
        });
        delete def[key];
        return member;
    }
    static convertModule(){
        this.scope={};
        this.definition=this.definition.bind(this.scope);
        this.definition(def=>{
            this.default = def.default;
            delete def.default;
            Object.keys(def).forEach(key=>{
                var member = Helpers.convertModuleMember.bind(this)(key,def);
                var metadata = Metadata.get(member);
                Object.defineProperty(this.scope,metadata.name,{
                    configurable : true,
                    get : function(){
                        return Object.defineProperty(this,metadata.name,Decorator.decorate(this,member))[metadata.name];
                    }
                })
            });
            return Runtime;
        });
        delete this.definition;
    }
    static convertModuleMember(key,def){
        var member = def[key];
        var decors = member.A;
        var kind = 'unknown';
        if(typeof member =='function'){
            member = Helpers.convertClass.bind(this)(member);
            kind = 'class'
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
        Metadata.set(member,{
            name        : key,
            module      : this,
            type        : kind,
            decorators  : decors
        });
        delete def[key];
        return member;
    }
    static onModuleComplete(r){
        Helpers.convertModule.bind(this)();
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
    static onModuleFailure(e){
        console.error(e);
        throw e;
    }
    static onProjectComplete(r){
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
    static onProjectFailure(r){
        console.info(r);
        return this;
    }
}
class Metadata {
    static METADATA = Symbol('metadata');
    static set(target,data){
        var metadata = target[Metadata.METADATA];
        if(!metadata){
            metadata = target[Metadata.METADATA] = Object.create(null);
        }
        for(var key in data){
            if(data[key]!==undefined){
                if(data[key]===null){
                    delete metadata[key];
                }else{
                    metadata[key] = data[key];
                }
            }
        }
        return metadata;
    }
    static get(target){
        return target[Metadata.METADATA];
    }
}
class Decorator {
    static TYPE = Symbol('type');

    static decorate(target,member){
        var descriptor = {
            configurable    : true,
            enumerable      : true,
            writable        : true,
            value           : member
        };
        var metadata = Metadata.get(member);
        if(metadata.decorators){
            metadata.decorators(new Decorator(target,member,descriptor));
            delete metadata.decorators;
        }
        if(metadata.type=='field'){
            descriptor.value = member.call(target);
            //Metadata.set(descriptor.value,metadata);
        }
        return descriptor;
    }
    constructor(target,member,descriptor){
        var metadata = Metadata.get(member);
        var instance = function(fn){
            switch(metadata.type){
                case 'class'    :fn(member);break;
                case 'field'    :fn(target,metadata.name,descriptor);break;
                case 'method'   :fn(target,metadata.name,descriptor);break;
            }
        };
        Helpers.setPrototypeOf(instance,Object.create(Decorator.prototype,{
            constructor:{value:Decorator}
        }));

        return instance;
    }
    type(Type){
        return function(target,key,descriptor){
            Metadata.get(descriptor.value)[Decorator.TYPE] = Type;
        }
    }
    extend(Parent){
        return function(Child){
            Helpers.inherits(Child,Parent)
        }
    }
    args(){
        return function(target,key,descriptor){
            console.info('ARGS',target,key,descriptor);
        }
    }
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
        var name = Helpers.getProjectName(id);
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
        this.name = Helpers.getProjectName(id);
        this.version = Helpers.getProjectVersion(id);
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
                    .then(Helpers.onProjectComplete.bind(this))
                    .catch(Helpers.onProjectFailure.bind(this))
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
        return Project.load(Helpers.getProjectId(id)).then(project=>{
            return project.module(Helpers.getModuleName(id)).load();
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
        Project.get(Helpers.getProjectName(id)).module(Helpers.getModuleName(id)).definition=definition;
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
                .then(Helpers.onModuleComplete.bind(this))
                .catch(Helpers.onModuleFailure.bind(this));
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


