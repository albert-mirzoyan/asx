import {NodeLoader} from './loader';
import {BrowserLoader} from './loader';


export const MIRROR = Symbol.for('mirror');
export const SUPER = Symbol.for('super');

export class Mirror {
    static reflect(instance){
        if(instance[MIRROR]){
            return instance[MIRROR];
        }else
        if(instance.constructor[MIRROR]){
            return instance.constructor[MIRROR];
        }
    }
}
export class Platform {
    static NODE     = new Platform('NODE');
    static BROWSER  = new Platform('BROWSER');
    constructor(name){
        this.type = name;
    }
    toString(){
        return `Platform.${this.type}`;
    }
}
export class Instance {
    constructor(type,target){
        var binding = function Super(){
            return type.apply(target,arguments);
        };
        Object.keys(type.prototype).forEach(key=>{
            var descriptor = Object.getOwnPropertyDescriptor(type.prototype,key);
            if(typeof descriptor.value == "function"){
                descriptor.value = descriptor.value.bind(binding);
            }
            if(typeof descriptor.get == "function"){
                descriptor.get = descriptor.get.bind(binding);
            }
            if(typeof descriptor.set == "function"){
                descriptor.set = descriptor.set.bind(binding);
            }
            Object.defineProperty(binding,key,descriptor);
        });
        return binding;
    }
}
export class Type {
    constructor(value,...params){
        this.value = value;
        this.params = params;
    }
}
export class Declaration {
    static accessor(scope,name,descriptor){
        if(descriptor.initializer){
            var initializer  = descriptor.initializer;
            var enumerable   = descriptor.enumerable;
            var configurable = descriptor.configurable;
            var writable     = descriptor.writable;
            descriptor = {
                enumerable   : true,
                configurable : true
            };
            descriptor.get = function accessor(){
                /*var caller = arguments.callee.caller;
                while(caller){
                    if(caller!=initializer){
                        caller = caller.caller;
                    }else{
                        console.info("RECURSION");
                        return undefined;
                    }
                }*/
                return Object.defineProperty(this,name,{
                    enumerable   : enumerable,
                    configurable : configurable,
                    writable     : writable,
                    value        : initializer.call(this)
                })[name]
            };
            descriptor.get[MIRROR]=initializer;
        }
        Object.defineProperty(scope,name,descriptor);
        return scope;
    }
    type(target,...params){
        return new Type(target,...params);
    }
    args(target,argums){
        argums.has = function has(n){
            return this[n]!==undefined;
        };
        argums.rest = function has(n){
            return Array.prototype.slice.call(this,n);
        };
    }
    arg(target,...params){
        return {ARGUMENT:'IMPLEMENT ME'};
    }
    toString(){
        return `${this.constructor.name}(${this.uri})`
    }
}
export class System  {
    get platform(): Platform {
        return Object.defineProperty(this,'platform',{
            enumerable      : true,
            configurable    : false,
            writable        : false,
            value           : (()=>{
                if (typeof process != 'undefined') {
                    return Platform.NODE;
                }
                if (typeof window != 'undefined') {
                    return Platform.BROWSER;
                }
            })()
        }).platform;
    }
    get loader():Loader {
        return Object.defineProperty(this,'loader',{
            enumerable      : true,
            configurable    : false,
            writable        : false,
            value           : (()=>{
                switch(this.platform){
                    case Platform.BROWSER   : return new BrowserLoader(this);
                    case Platform.NODE      : return new NodeLoader(this);
                }
            })()
        }).loader;
    }
    get modules():Object{
        return Object.defineProperty(this,'modules',{
            enumerable      : true,
            configurable    : false,
            writable        : false,
            value           : {}
        }).modules;
    }
    module(name,definer){
       new Module(this,name,definer);
    }
    constructor(){
        try {
            this.loader.setup({
                default     : this,
                global      : global,
                Type        : Type,
                Loader      : (()=>{
                    switch(this.platform){
                        case Platform.BROWSER   : return BrowserLoader;
                        case Platform.NODE      : return NodeLoader;
                    }
                })(),
                Instance    : Instance,
                Platform    : Platform,
                System      : System,
                Module      : Module,
                Class       : Class,
                Import      : Import,
                Export      : Export,
                Field       : Field,
                Mirror      : Mirror,
                Method      : Method
            });
            this.loader.load()
            .then(module=> {
                if (typeof module.default == 'function') {
                    module.default();
                }
            }).catch(e=> {
                console.error(e.stack);
            });
        }catch(e){
            console.error(e.stack);
        }
    }
}
export class Module extends Declaration {
    definitions : Array<Declaration>;
    reflectee   : Function;
    constructor(owner,uri,definer){
        super();
        if(typeof definer == 'function'){
            var config = owner.loader.module(uri);
            Object.defineProperty(this,'owner',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : owner
            });
            Object.defineProperty(this,'uri',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : config.uri
            });
            Object.defineProperty(this,'name',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : this.uri
            });
            Object.defineProperty(this,'definitions',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : []
            });
            Object.defineProperty(this,'exports',{
                enumerable      : true,
                writable        : false,
                configurable    : true,
                value           : {[MIRROR]:this}
            });
            Object.defineProperty(this,'private',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : {}
            });
            Object.defineProperty(this,'proxies',{
                enumerable      : true,
                writable        : false,
                configurable    : true,
                value           : []
            });
            definer.bind(this.private)(this);

        }else
        if(typeof definer == 'object'){
            var config = owner.loader.module(uri);
            Object.defineProperty(this,'owner',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : owner
            });
            Object.defineProperty(this,'uri',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : config.uri
            });
            Object.defineProperty(this,'name',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : this.uri
            });
            Object.defineProperty(this,'exports',{
                enumerable      : true,
                writable        : false,
                configurable    : true,
                value           : {[MIRROR]:this}
            });
            Object.defineProperty(this,'proxies',{
                enumerable      : true,
                writable        : false,
                configurable    : true,
                value           : []
            });
            for(var i in definer){
                this.exports[i] = definer[i];
            }
        }
        var self = this;
        Declaration.accessor(this.owner.modules,this.uri,{
            enumerable      :true,
            configurable    :true,
            initializer     :function(){
                if(!self.initializing){
                    self.initializing = true;
                    try {
                        Object.keys(config.exports).forEach(uri=> {
                            var exports = config.exports[uri];
                            for(var local in exports){
                                var remote = exports[local]=='*'?local:exports[local];
                                self.define(new Export(self,uri,local,remote));
                            }
                        });
                        Object.keys(config.imports).forEach(uri=> {
                            var imports = config.imports[uri];
                            for(var local in imports){
                                var remote = imports[local]=='*'?local:imports[local];
                                self.define(new Import(self, uri,remote,local));
                            }
                        });
                    }catch(ex){
                        console.error(ex);
                    }

                    if(self.proxies.length){
                        self.proxies.forEach(p=>p());
                    }
                    delete self.proxies;

                    var i;
                    if(self.private){
                        for (i in self.private) {
                            if(i!='default'){
                                i = self.private[i];
                            }
                        }
                        i=self.private.default;
                    }
                    if(self.exports){
                        for (i in self.exports) {
                            if(i!='default'){
                                i = self.exports[i];
                            }
                        }
                        i=self.exports.default;
                    }



                }
                delete self.initializing;
                return self.exports;
            }
        });
    }
    define(definition){
        if(definition instanceof Export){
            this.definitions.push(definition);
            Declaration.accessor(this.exports,definition.name,definition.initialize());
        }else
        if(definition instanceof Import){
            this.definitions.push(definition);
            if(definition.name=='*'){
                this.proxies.push(definition.initialize().initializer);
            }else{
                Declaration.accessor(this.private,definition.name,definition.initialize());
            }
        }else
        if(definition instanceof Class){
            this.definitions.push(definition);
            Declaration.accessor(this.private,definition.name,definition.initialize());
        }else
        if(definition instanceof Method){
            this.definitions.push(definition);
            Declaration.accessor(this.private,definition.name,definition.initialize());
        }else
        if(definition instanceof Field){
            this.definitions.push(definition);
            Declaration.accessor(this.private,definition.name,definition.initialize());
        }else{
            throw new Error('Invalid Declaration');
        }
    }
    class(name,definer){
        this.define(new Class(this,name,definer));
    }
    field(name,isStatic,definer){
        this.define(new Field(this,name,isStatic,definer));
    }
    method(name,isStatic,definer){
        this.define(new Method(this,name,isStatic,definer));
    }
}
export class Class extends Declaration {
    static properties = ["reflectee", "type", "parameters", "extends", "implements", "decorators"];
    static implements(child, parent) {

    }
    static extends(child, parent) {
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

    owner       : Declaration;
    reflectee   : Function;
    definitions : Array<Declaration>;
    constructor(owner,name,definer){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'isTopLevel',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner instanceof Module
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'uri',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : this.owner.uri + (this.isTopLevel ? '#':'.') + this.name
        });
        Object.defineProperty(this,'definitions',{
            enumerable      : true,
            writable        : false,
            configurable    : true,
            value           : []
        });
        if(typeof definer == 'function'){
            definer(this);
            Object.defineProperty(this,'definitions',{
                enumerable      : true,
                writable        : false,
                configurable    : false,
                value           : this.definitions.filter(d=>{
                    if(d instanceof Method && d.name=='constructor'){
                        Class.properties.forEach(key=>{
                            var option = Object.getOwnPropertyDescriptor(d,key);
                            if(option){
                                Object.defineProperty(this,key,option);
                            }
                        });
                        this.reflectee[MIRROR] = this;
                        return false;
                    }else{
                        return true;
                    }
                })
            });

        }
        //console.info(this.toString());
        this.initialize = ()=>{
            delete this.initialize;
            var _this = this;
            return {
                enumerable      : true,
                writable        : false,
                configurable    : true,
                initializer     : function(){
                    Object.defineProperty(this,_this.name,{
                        enumerable      : true,
                        writable        : false,
                        configurable    : true,
                        value           : _this.reflectee
                    });
                    if(_this.extends){
                        Class.extends(_this.reflectee,_this.extends);
                    }
                    if(_this.implements && _this.implements.length){
                        _this.implements.forEach(d=>{
                            Class.implements(_this.reflectee,d);
                        });
                    }
                    _this.definitions.forEach(d=>{
                        if(d.isStatic){
                            Declaration.accessor(_this.reflectee,d.name,d.initialize());
                        }else{
                            Declaration.accessor(_this.reflectee.prototype,d.name,d.initialize());
                        }
                    });
                    if(_this.decorators && _this.decorators.length){
                        _this.decorators.forEach(d=>{
                            d.call(_this,_this.reflectee);
                        })
                    }
                    for(var i in _this.reflectee){
                        i = _this.reflectee[i];
                    }
                    return _this.reflectee;
                }
            };
        }
    }
    define(definition){
        if(definition instanceof Field){
            this.definitions.push(definition);
        }else
        if(definition instanceof Method){
            this.definitions.push(definition);
        }else{
            throw new Error('Invalid Declaration');
        }
    }
    field(name,isStatic,definer){
        this.define(new Field(this,name,isStatic,definer));
    }
    method(name,isStatic,definer){
        this.define(new Method(this,name,isStatic,definer));
    }
    super(instance,args){
        for(var key in instance){
            key = instance[key];
        }
        if(!instance[SUPER] && this.extends){
            instance[SUPER] = new Instance(this.extends,instance);
            if(args){
                instance[SUPER].apply(undefined,args);
            }
        }
        return instance[SUPER];
    }
}
export class Import extends Declaration {
    constructor(owner,uri,name,remote){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'uri',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'remote',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : remote
        });
        this.initialize = ()=>{
            delete this.initialize;
            var self = this;
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                initializer  : function(){
                    if(self.remote=='*'){
                        return Asx.modules[uri];
                    }else{
                        return Asx.modules[uri][self.remote];
                    }
                }
            };
            return descriptor;
        }
    }
}
export class Export extends Declaration {
    constructor(owner,uri,name,remote){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'uri',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'isLocal',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : this.owner.uri == uri
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'remote',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : remote
        });
        this.initialize = ()=>{
            delete this.initialize;
            var self = this;
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                initializer  : function(){
                    return self.isLocal
                        ? owner.private[self.remote]
                        : Asx.modules[uri][self.remote];
                }
            };
            return descriptor;
        }
    }
}
export class Field  extends Declaration {
    owner       : Declaration;
    reflectee   : Function;
    constructor(owner,name,isStatic,definer){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'isTopLevel',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner instanceof Module
        });
        Object.defineProperty(this,'isStatic',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : isStatic
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'uri',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : this.owner.uri + (this.isTopLevel ? '#':(this.isStatic?':':'.')) + this.name
        });
        if(definer){
            definer.forEach(option=>{
                var di,dn;
                if((di=option.name.indexOf('$'))>=0){
                    dn = option.name.substring(di+1);
                }
                if(dn) {
                    Object.defineProperty(this,dn,{
                        enumerable      : true,
                        configurable    : true,
                        get             : function(){
                            return Object.defineProperty(this,dn,{
                                enumerable      : true,
                                writable        : false,
                                configurable    : false,
                                value           : option.call(this)
                            })[dn]
                        }
                    })
                } else {
                    option[MIRROR] = this;
                    Object.defineProperty(this,'reflectee',{
                        enumerable      : true,
                        writable        : false,
                        configurable    : false,
                        value           : option
                    });
                }
            })
        }
        //console.info(this.toString());
        this.initialize = ()=>{
            delete this.initialize;
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                initializer  : this.reflectee
            };
            if(this.decorators && this.decorators.length){
                this.decorators.forEach(d=>{
                    descriptor = d.call(this,this.owner.reflectee,this.name,descriptor) || descriptor;
                })
            }
            return descriptor;
        }
    }
}
export class Method  extends Declaration {
    owner       : Declaration;
    reflectee   : Function;
    constructor(owner,name,isStatic,definer){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'isTopLevel',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner instanceof Module
        });
        Object.defineProperty(this,'isStatic',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : isStatic
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'uri',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : this.owner.uri + (this.isTopLevel ? '#':(this.isStatic?':':'.')) + this.name
        });
        if(definer){
            definer.forEach(option=>{
                var di,dn;
                if((di=option.name.indexOf('$'))>=0){
                    dn = option.name.substring(di+1);
                }
                if(dn){
                    Object.defineProperty(this,dn,{
                        enumerable      : true,
                        configurable    : true,
                        get             : function(){
                            return Object.defineProperty(this,dn,{
                                enumerable      : true,
                                writable        : false,
                                configurable    : true,
                                value           : option.call(this)
                            })[dn]
                        }
                    })
                } else {
                    option[MIRROR] = this;
                    Object.defineProperty(this,'reflectee',{
                        enumerable      : true,
                        writable        : false,
                        configurable    : false,
                        value           : option
                    });
                }
            });
        }
        //console.info(this.toString());
        this.initialize = ()=>{
            delete this.initialize;
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                value        : this.reflectee
            };
            if(this.decorators && this.decorators.length){
                this.decorators.forEach(d=>{
                    descriptor = d.call(this,this.owner.reflectee,this.name,descriptor) || descriptor;
                })
            }
            return descriptor;
        }
    }
}
