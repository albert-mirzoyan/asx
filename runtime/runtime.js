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
                    },
                    set             : function(v){
                        var decorator = Decorator.decorate(this,member);
                        decorator.value = v;
                        return Object.defineProperty(this,metadata.name,decorator)[metadata.name];
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
    static initializeModuleImports(){
        if(this.imports){
            var imports = Object.keys(this.imports);
            if(imports.length){
                imports = imports.map(i=>{
                    return Module.load(i).then(m=>{
                        Object.keys(this.imports[i]).forEach(k=>{
                            var ref = this.imports[i][k];
                            if(ref=='*'){
                                ref = k;
                            }
                            Object.defineProperty(this.scope,ref,{
                                configurable:true,
                                get:function(){
                                    return Object.defineProperty(this,ref,{
                                        value : m[ref]
                                    })[ref];
                                }
                            });
                        })
                    });
                });
                promise = promise.then(r=>Promise.all(imports))
            }
        }
    }
    static initializeModuleProxies(){
        if(this.proxies){
            var proxies = Object.keys(this.proxies);
            if(proxies.length){
                proxies = proxies.map(i=>{
                    return Module.load(i).then(m=>{
                        Object.keys(this.proxies[i]).forEach(k=>{
                            var ref = this.proxies[i][k];
                            if(ref=='*'){
                                ref = k;
                            }
                            Object.defineProperty(this.exports,ref,{
                                configurable    : true,
                                get             : function(){
                                    return Object.defineProperty(this,ref,{
                                        value : m[ref]
                                    })[ref];
                                }
                            });
                        })
                    });
                });
                promise = promise.then(r=>Promise.all(proxies))
            }
        }
    }
    static initializeModuleExports(){
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
                var scope = this.scope;
                Object.defineProperty(this.exports,local,{
                    configurable:true,
                    get:function(){
                        return Object.defineProperty(this,local,{
                            value : scope[local]
                        })[local];
                    }
                });
            }
        });
    }
    static onModuleComplete(r){
        Helpers.convertModule.bind(this)();
        console.info('INITIALIZE MODULE');
        delete this.pending;
        return this.exports;
    }
    static onModuleFailure(e){
        console.error(e);
        throw e;
    }
    static resolveProjectDependencies(){
        var list = [];
        Object.keys(this.modules).forEach(m=>{
            var module = this.modules[m];
            list = list.concat(Object.keys(module.imports));
            list = list.concat(Object.keys(module.proxies));
        });
        return list
            .map(m=>Helpers.getProjectName(m))
            .filter((p,i,a)=>(a.indexOf(p)==i&&p!=this.name));
    }
    static onProjectComplete(r){
        this.name = r.name;
        this.version = r.version;
        this.modules = {};
        var mods = [];
        Object.keys(r.modules).forEach(id=>{
            mods.push(Module.get(this.name+'/'+id).resolve(r.modules[id]).then(m=>{
                this.modules[m.name] = m;
            }));
        });
        return Promise.all(mods).then(ms=>{
            console.info(ms);
            return this
        }).catch(e=>{
            console.info(e);
        });
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
            Object.defineProperty(target,metadata.name,descriptor)
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
            if(descriptor){
                Metadata.get(descriptor.value)[Decorator.TYPE] = Type;
            }else{
                Metadata.get(target)[Decorator.TYPE] = Type;
            }
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
        if(this.loading) {
            return this.loading;
        } else
        if(this.loaded){
            return Promise.resolve(this);
        }else{
            var promise = Promise.resolve(this);
            if(!this.version){
                console.info("LOADING VERSION FOR "+this.name);
                promise = Loader.loadJson(this.name+'/project.json').then(r=>{
                    console.info("LOADED VERSION FOR "+this.name+" IS "+r.latest);
                    this.version = r.latest;
                    return this;
                });
            }
            return this.loading = promise.then(v=>{
                return Loader.loadJson(this.name+'/'+this.version+'/package.json').then(r=>{
                    this.modules = r.modules;
                    delete this.loading;
                    this.loaded = true;
                    return this;
                })
            });
        }
    }
}
class Module {
    static get modules():Object {
        return Object.defineProperty(this, 'modules', {
            value: {}
        }).modules
    }
    static load(id){
        return Module.get(id).load();
    }
    static get(id):Module {
        var module = Module.modules[id];
        if (!module){
            module = Object.defineProperty(Module.modules, id, {
                value : new Module(id)
            })[id];
        }
        return module;
    }
    static define(id, definition) {
        Module.get(Helpers.getProjectName(id)+'/'+Helpers.getModuleName(id)).definition=definition;
    }
    constructor(id){
        this.name       = Helpers.getModuleName(id);
        this.project    = Project.get(Helpers.getProjectName(id));
    }
    load(){
        if(this.loading) {
            return Promise.resolve(this);
        } else
        if(this.loaded){
            return Promise.resolve(this);
        }else{
            var promise = Promise.resolve(this);
            if(!this.version){
                console.info("LOADING VERSION FOR "+this.name);
                promise = this.project.load().then(p=>{
                    console.info("LOADED VERSION FOR "+this.name+" IS "+p.version);
                    this.version = p.version;
                    return this;
                });
            }
            promise = promise.then(()=>{
                var config = this.project.modules[this.name];
                var dependencies = [];
                dependencies = dependencies.concat(Object.keys(config.imports));
                dependencies = dependencies.concat(Object.keys(config.proxies));
                if(dependencies.length){
                    console.info("LOADING DEPENDENCIES FOR "+this.name);
                    return Promise.all(dependencies.map(d=>Module.load(d))).then(r=>{
                        console.info("LOADED DEPENDENCIES FOR "+this.name);
                        return this;
                    })
                }
                return this;
            });
            promise = promise.then(()=>{
                return Loader.load(this.project.name+'/'+this.project.version+'/'+this.name).then(()=>{
                    return this;
                });
            });
            return this.loading = promise.then(()=>{
                this.loaded = true;
                delete this.loading;
                return this.initialize();
            });
        }
    }
    initialize(){
        if(this.initialized){
            return this.exports;
        }else{
            var scope = this.scope   = {};
            Helpers.convertModule.bind(this)();
            this.exports = {};
            var config = this.project.modules[this.name];
            Object.keys(config.exports).forEach(k=>{
                var n = config.exports[k];
                if(n=='*'){
                    n=k;
                }
                Object.defineProperty(this.exports,n,{
                    configurable:true,
                    get:function(){
                        return Object.defineProperty(this,n,{
                            value :scope[n]
                        })[n];
                    }
                })
            });
            if(this.default){
                var def = this.default.bind(this);
                Object.defineProperty(this.exports,'default',{
                    configurable:true,
                    get:function(){
                        return Object.defineProperty(this,'default',{
                            value : def()
                        }).default;
                    }
                });
                delete this.default;
            }
            Object.keys(config.imports).forEach(m=>{
                var imports = config.imports[m];
                Object.keys(imports).forEach(k=>{
                    var n = imports[k];
                    if(n=='*'){
                        n=k;
                    }
                    Object.defineProperty(scope,n,{
                        configurable:true,
                        get:function(){
                            return Object.defineProperty(this,n,{
                                value : Module.get(m).exports[n]
                            })[n];
                        }
                    })
                })
            });
            Object.keys(config.proxies).forEach(m=>{
                var imports = config.proxies[m];
                Object.keys(imports).forEach(k=>{
                    var n = imports[k];
                    if(n=='*'){
                        n=k;
                    }
                    Object.defineProperty(this.exports,n,{
                        configurable:true,
                        get:function(){
                            return Object.defineProperty(this,n,{
                                value : Module.get(m).exports[n]
                            })[n];
                        }
                    })
                })
            });
            return this;
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
                console.info(module.exports.default);
            });
        }
    }
}

Runtime.execute();


