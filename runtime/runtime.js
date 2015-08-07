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
function convertClass(def){
    var clazz = null;
    def(def=>{
        var SC = convertClassMember(':constructor',def);
        var IC = convertClassMember('.constructor',def);
        clazz = IC.value;
        Object.defineProperty(clazz,'class',{
            value : Object.create(Class.prototype,{
                '.constructor'      : {
                    value           : IC
                },
                constructor         : {
                    value           : Class
                }
            })
        });

        if(IC.parent){
            clazz.class.setParent(IC.parent);
        }else{
            clazz.__proto__=Object.create(null);
        }
        Object.keys(def).forEach(key=>{
            clazz.class.set(convertClassMember(key,def))
        });
    });
    return clazz;
}
function convertClassMember(key,def){
    var member = def[key];
    if(member){
        member.name = key.substring(1);
        member.static = key[0] == ':';
        if (member.F) {
            member.kind = 'method';
            member.value = member.F;
            if(member.P){
                member.parameters = convertMethodParameters(member.P);
                delete member.P;
            }
            if (member.E) {
                member.parent = member.E;
                delete member.E;
            }
            delete member.F;
        } else {
            member.kind = 'field';
            member.value = member.V;
            delete member.V;
        }
        if (member.T) {
            member.type = convertType(member.T);
            delete member.T;
        }
        if (member.A) {
            member.decorators = member.A;
            delete member.A;
        }
        member.__proto__=null;
    }
    delete def[key];
    return member;
}
function convertMethodParameters(params){
    var ret = Object.create(null);
    Object.keys(params).forEach(k=>{
        Object.defineProperty(ret,k,{
            value : convertMethodParameter(params[k])
        })
    });
    return ret;
}
function convertMethodParameter(param){
    var ret = Object.create(null);
    Object.defineProperty(ret,'type',{
        value : convertType(param)
    });
    return ret;
}
function convertType(type){
    var ret = Object.create(null);
    if(typeof type=='function'){
        Object.defineProperty(ret,'value',{value:type})
    }else
    if(Array.isArray(type)){
        Object.defineProperty(ret,'value',{value:type.shift()});
        if(type.length){
            if(type.length>1){
                Object.defineProperty(ret,'params',{
                    value : type.map(r=>convertType(r))
                });
            }else{
                Object.defineProperty(ret,'param',{
                    value : convertType(type.shift())
                });
            }
        }
    }
    if(ret.params || ret.param){
        return ret;
    }else{
        return ret.value;
    }
}

class Class {

    set(member){
        switch(member.kind){
            case 'method'   : this.setMethod(member); break;
            case 'field'    : this.setField(member); break;
        }
    }
    setParent(parent){
        inherits(this.getConstructor(),parent);
    }
    setMethod(method){
        this.setMember(method.static,method.name,{
            configurable    : true,
            enumerable      : true,
            get             : function(){
                return Object.defineProperty(this,method.name,{
                    configurable    : true,
                    writable        : true,
                    enumerable      : true,
                    value           : method.value.bind(this)
                })[method.name]
            },
            set             : function(v){
                return Object.defineProperty(this,method.name,{
                    value           : v.bind(this)
                })
            }
        });
    }
    setField(field){
        this.setMember(field.static,field.name,{
            configurable    : true,
            enumerable      : true,
            get             : function(){
                return Object.defineProperty(this,field.name,{
                    configurable    : true,
                    writable        : true,
                    enumerable      : true,
                    value           : field.value()
                })[field.name]
            },
            set             : function(v){
                return Object.defineProperty(this,field.name,{
                    value           : v
                })
            }
        });
    }
    setMember(slot,name,descriptor){
        Object.defineProperty(slot ?
            this.getConstructor():
            this.getPrototype(),
            name,descriptor
        );
    }

    get(filter){

    }
    getSlot(member){
        if(member.static){
            return this.getConstructor();
        }else{
            return this.getPrototype();
        }
    }
    getPrototype(){
        return this.getConstructor().prototype;
    }
    getConstructor(){
        return this['.constructor'].value;
    }
}
class Module {
    static get modules():Object {
        return Object.defineProperty(this, 'modules', {
            value: {}
        }).modules
    }

    static get(id):Module {
        var module = Module.modules[id];
        if (!module) {
            module = Object.defineProperty(Module.modules, id, {
                value: new Module(id)
            })[id];
            return module.initialize();
        } else {
            return Promise.resolve(module);
        }
    }

    static define(id, definition) {
        Module.get(id).then(module=> {
            module.define(definition);
        })
    }

    constructor(id) {
        this.id = id;
        this.exports = Object.create(null);
    }

    initialize() {
        return Promise.resolve(this).then(module=> {
            if (module.initialized) {
                return module;
            } else {
                var clean = ()=> {
                    delete this.scope;
                    delete this.definition;
                    delete this.onComplete;
                    delete this.onFailure;
                    module.initialized = true;
                };
                return new Promise((accept, reject)=> {
                    this.onComplete = r=> {
                        accept(this);
                        clean();
                    };
                    this.onFailure = e=> {
                        reject(e, this);
                        clean();
                    };
                    this.load();
                })
            }
        });
    }

    define(definition) {
        this.definition = definition;
    }

    load() {
        return Loader.load(this.id)
            .then(r=> {
                this.definition.execute.bind(this.scope = {})(this);
                this.onComplete();
            })
            .catch(e=> {
                this.onFailure();
            });
    }

    class(name, definer) {
        var exports = this.exports;
        Object.defineProperty(this.scope, name, {
            configurable: true,
            get: function () {
                delete this[name];
                Object.defineProperty(this, name, {
                    value: convertClass(definer)
                });
                var exported = Object.getOwnPropertyDescriptor(exports,name);
                if(exported){
                    Object.defineProperty(exports, name, {
                        value: this[name]
                    });
                }
                return this[name];
            }
        })
    }

    export(definer) {

        for (var name in definer) {
            Object.defineProperty(this.exports, name, {
                configurable: true,
                get: function () {
                    Object.defineProperty(this, name, {
                        value: definer[name]()
                    });
                    return this[name];
                }
            })
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

    static load(path) {
        var url = Loader.resolve(Loader.repository, path + '.js');

        function loadScript(url) {
            return new Promise((accept, reject)=> {
                var script = document.createElement("script")
                script.type = "text/javascript";
                script.onload = accept;
                script.onerror = reject;
                script.src = url;
                document.getElementsByTagName("head")[0].appendChild(script);
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
        Runtime.global.Class = Class;
        Runtime.global.Module = Module;
        Runtime.global.Module = Module;

        if (this.executable) {
            Module.get(this.executable).then(module=> {
                console.info(module.exports);
                console.info(module.exports.default);
            });
        }
    }
}



Runtime.execute();


