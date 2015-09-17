import {Mirror} from './mirror';

class Helpers {
    static object(o){
        o.__proto__ = null;
        return o;
    }
    static setPrototypeOf(instance,proto){
        instance.__proto__ = proto;
    }
    static inherits(child, parent) {
        if (typeof parent !== 'function' && parent !== null) {
            throw new TypeError('Super expression must either be null or a function, not ' + typeof parent);
        }
        var override = child.prototype;
        child.prototype = Object.create(parent && parent.prototype);
        Object.getOwnPropertyNames(override).forEach(n=>{
            var d = Object.getOwnPropertyDescriptor(override,n);
            if(n=='constructor'){
                d.enumerable = false;
            }
            Object.defineProperty(child.prototype,n,d);
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
                    enumerable      : true,
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
            return new ClassContext(clazz);
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
    static defineClassMember(key,def){

    }
    static initializeClassMember(key,def){

    }

    static convertModule(scope){
        this.definition=this.definition.bind(scope);
        this.definition(def=>{
            this.default = def.default;
            delete def.default;
            Object.keys(def).forEach(key=>{
                Helpers.defineModuleMember(scope,key,Helpers.convertModuleMember.bind(this)(key,def))
            });
            return Runtime;
        });
        delete this.definition;
    }
    static initializeModule(){
        var scope = Object.create(null);
        var exports = Object.create(null);
        Helpers.convertModule.bind(this)(scope);
        var config = Module.project(this.project).modules[this.name];
        Object.keys(config.exports).forEach(k=>{
            var n = config.exports[k];
            if(n=='*'){
                n=k;
            }
            Object.defineProperty(exports,n,{
                enumerable      : true,
                configurable    : true,
                get             : function(){
                    return Object.defineProperty(this,n,{
                        enumerable      : true,
                        writable        : false,
                        configurable    : true,
                        value           : scope[n]
                    })[n];
                }
            })
        });
        if(this.default){
            var def = this.default.bind(this);
            Object.defineProperty(exports,'default',{
                enumerable      : true,
                configurable    : true,
                get             : function(){
                    return Object.defineProperty(this,'default',{
                        enumerable      : true,
                        writable        : false,
                        configurable    : true,
                        value           : def()
                    }).default;
                }
            });
        }
        delete this.default;
        Object.keys(config.imports).forEach(m=>{
            var imports = config.imports[m];
            Object.keys(imports).forEach(k=>{
                var n = imports[k];
                if(n=='*'){
                    n=k;
                }
                Object.defineProperty(scope,n,{
                    enumerable      : true,
                    configurable    : true,
                    get             : function(){
                        return Object.defineProperty(this,n,{
                            enumerable      : true,
                            writable        : false,
                            configurable    : true,
                            value           : Module.get(m).exports[n]
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
                Object.defineProperty(exports,n,{
                    enumerable      : true,
                    configurable    : true,
                    get             : function(){
                        return Object.defineProperty(this,n,{
                            enumerable      : true,
                            writable        : false,
                            configurable    : true,
                            value           : Module.get(m).exports[n]
                        })[n];
                    }
                })
            })
        });
        Object.defineProperty(this,'exports',{
            enumerable      : true,
            configurable    : true,
            get             : function(){
                if(Object.keys(exports).length){
                    return Object.defineProperty(this,'exports',{
                        enumerable      : true,
                        writable        : true,
                        configurable    : true,
                        value           : exports
                    }).exports;
                }else{
                    delete this.exports;
                }
            }
        });
        Object.defineProperty(this,'scope',{
            enumerable      : true,
            configurable    : true,
            get             : function(){
                if(Object.keys(scope).length){
                    return Object.defineProperty(this,'scope',{
                        enumerable   : true,
                        writable     : true,
                        configurable : true,
                        value        : scope
                    }).scope;
                }else{
                    delete this.scope;
                }
            }
        });
        return this;
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
    static defineModuleMember(scope,key,member){
        Object.defineProperty(scope,key,{
            enumerable      : true,
            configurable    : true,
            get             : function(){
                return Object.defineProperty(this,key,
                    Helpers.initializeModuleMember(this,member)
                )[key];
            }
        })
    }
    static initializeModuleMember(scope,member){
        return Decorator.decorate(scope,member)
    }

    static loadProject(){
        if(this.loading) {
            return this.loading;
        } else
        if(!this.pending){
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
                    delete this.pending;
                    return this;
                })
            });
        }
    }
    static loadModule(){
        if(this.loading) {
            return Promise.resolve(this);
        } else
        if(!this.pending){
            return Promise.resolve(this);
        }else{
            var promise = Promise.resolve(this);
            if(!this.version){
                console.info("LOADING VERSION FOR "+this.name);
                promise = Helpers.loadProject.bind(Module.project(this.project))().then(p=>{
                    console.info("LOADED VERSION FOR "+this.name+" IS "+p.version);
                    this.version = p.version;
                    return this;
                });
            }
            promise = promise.then(()=>{
                var config = Module.project(this.project).modules[this.name];
                var dependencies = [];
                if(config.imports){
                    dependencies = dependencies.concat(Object.keys(config.imports));
                }
                if(config.proxies){
                    dependencies = dependencies.concat(Object.keys(config.proxies));
                }
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
                var project = Module.project(this.project);
                return Loader.load(project.name+'/'+project.version+'/'+this.name).then(()=>{
                    return this;
                });
            });
            return this.loading = promise.then(()=>{
                delete this.loading;
                delete this.pending;
                return Helpers.initializeModule.bind(this)();
            });
        }
    }

}

class ModuleMirror {
    uri          : String;
    declarations : Map<Symbol,DeclarationMirror>;
    dependencies : List<DependencyMirror>;
}
class MirrorSystem {}
class Reflect {
    static system : MirrorSystem;
    static reflect(object:Object){

    }
}

class Metadata {
    static METADATA = Symbol.metadata = Symbol('metadata');
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
                case 'class'    :
                    fn(member);
                    break;
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
        return (Child)=>{
            Helpers.inherits(Child,Parent)
        }
    }
    args(){
        return (target,key,descriptor)=>{
            console.info('ARGS',target.name,key,descriptor);
        }
    }
}
class Module {
    static get projects():Object {
        return Object.defineProperty(this, 'projects', {
            enumerable      : true,
            writable        : true,
            configurable    : false,
            value           : Object.create(null)
        }).projects
    }
    static get modules():Object {
        return Object.defineProperty(this, 'modules', {
            enumerable      :true,
            writable        :true,
            configurable    :false,
            value: Object.create(null)
        }).modules
    }
    static load(id){
        return Helpers.loadModule.bind(Module.get(id))().then(m=>{
            return m.exports;
        });
    }
    static get(id):Module {
        var module = Module.modules[id];
        if (!module){
            module = Object.defineProperty(Module.modules, id, {
                enumerable      : true,
                writable        : true,
                configurable    : true,
                value           : new Module(id)
            })[id];
        }
        return module;
    }
    static set(id,exports){
        var module = Module.get(id);
        module.pending = false;
        module.exports = exports;
        return module;
    }
    static project(id) {
        var name = Helpers.getProjectName(id);
        var project = this.projects[name];
        if (!project) {
            project = Object.defineProperty(this.projects, name, {
                configurable    : false,
                enumerable      : true,
                writable        : false,
                value           : Helpers.object({
                    name        : Helpers.getProjectName(id),
                    version     : Helpers.getProjectVersion(id),
                    pending     : true
                })
            })[name];
        }
        return project;
    }
    static define(id, definition) {
        Module.get(Helpers.getProjectName(id)+'/'+Helpers.getModuleName(id)).definition=definition;
    }
    constructor(id){
        this.name       = Helpers.getModuleName(id);
        this.project    = Helpers.getProjectName(id);
        this.pending    = true;
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
        Module.set('runtime',{
            Reflect : Reflect
        });
        if (this.executable) {
            Module.load(this.executable).then(module=> {
                var result =  module && module.default;
                Object.keys(Module.modules).forEach(m=>{
                    m = Module.get(m);
                    if(m.exports){
                        Object.getOwnPropertyNames(m.exports).forEach(name=>m.exports[name])
                    }
                    if(m.scope){
                        Object.getOwnPropertyNames(m.scope).forEach(name=>m.scope[name]);
                    }
                    delete m.scope;
                });
                if(typeof result =='function'){
                    result = result();
                }
                if(typeof result !='undefined'){
                    console.log(result)
                }
            });
        }
    }
}

class GlobalContext {
    args(target,argums){
        argums.has = function has(n){
            return this[n]!==undefined;
        };
        argums.rest = function has(n){
            return Array.prototype.slice.call(this,n);
        };
    }
}

class ModuleContext extends GlobalContext {}
class ClassContext extends GlobalContext {
    constructor(clazz){
        super();
        this.classReference = clazz;
    }
    super(target,args){
        if(this.classReference.__proto__){
            this.classReference.__proto__.apply(target,args);
        }
        Object.keys(this.classReference.prototype).forEach(k=>target[k]);
    }
}

Runtime.execute();


