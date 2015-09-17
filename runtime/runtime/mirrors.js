export const MIRROR = Symbol.for('mirror');
export const SUPER = Symbol.for('super');

@globalize('Asx',true)
export class GlobalBuilder {
    static property(scope,name,descriptor){
        if(descriptor.initializer){
            var initializer  = descriptor.initializer;
            var enumerable   = descriptor.enumerable;
            var configurable = descriptor.configurable;
            var writable     = descriptor.writable;
            descriptor = {
                enumerable   : true,
                configurable : true,
                get          : function(){
                    delete this[name];
                    return Object.defineProperty(this,name,{
                        enumerable   : enumerable,
                        configurable : configurable,
                        writable     : writable,
                        value        : initializer.call(this)
                    })[name]
                }
            }
        }
        Object.defineProperty(scope,name,descriptor);
        return scope;
    }
    static cast(type,instance,...params){
        instance.__proto__ = type.prototype;
        instance.__proto__.constructor = type;
        instance.constructor = type;
        instance.constructor.apply(instance,params);
        return instance;
    }
    cast(type,instance,...params){
        return GlobalBuilder.cast.apply(this,arguments);
    }
    module(uri,definer){
        var builder = new ModuleBuilder();
        var module = builder.build(uri,definer);
        Object.defineProperty(system.loader.modules,module.uri,{
            enumerable      : true,
            configurable    : true,
            writable        : false,
            value           : module.reflectee
        });
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
}

export class ModuleBuilder extends GlobalBuilder {
    build(uri, definer){
        var scope = {};
        this.module = this.cast(Module,system.loader.module(uri),scope);
        definer.call(scope,this);
        return this.module;
    }
    field(name,isStatic,definer){
        this.module.define(new Field(this.module,name,isStatic,definer));
    }
    method(name,isStatic,definer){
        this.module.define(new Method(this.module,name,isStatic,definer));
    }
    class(name,definer){
        this.module.define(new ClassBuilder().build(this.module,name,definer));
    }
}
export class ClassBuilder extends ModuleBuilder {
    build(module, name, definer){
        this.module = module;
        this.class  = new Class(module,name);
        definer(this);
        return this.class;
    }
    field(name,isStatic,definer){
        this.class.define(new Field(this.class,name,isStatic,definer));
    }
    method(name,isStatic,definer){
        this.class.define(new Method(this.class,name,isStatic,definer));
    }
    class(name,definer){
        this.class.define(new ClassBuilder().build(this.class,name,definer));
    }
    super(instance,args){
        for(var key in instance){
            key = instance[key];
        }
        if(!instance[SUPER] && this.class.extends){
            instance[SUPER] = new Instance(this.class.extends,instance);
            if(args){
                instance[SUPER].apply(undefined,args);
            }
        }

        return instance[SUPER];
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

    static get loader(){
        return global.system.loader
    }
}

export class Import extends Declaration {
    constructor(owner,name,specifiers){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'specifiers',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : specifiers
        });
    }
}
export class Export extends Declaration {
    constructor(owner,name,specifiers){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'specifiers',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : specifiers
        });
        Object.defineProperty(this,'isLocal',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : this.owner.uri == name
        });
    }
}

export class Module extends Declaration {
    reflectee   : Function;
    definitions : Array<Declaration>;
    constructor(scope){
        super();
        Object.defineProperty(this,'definitions',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : []
        });
        Object.defineProperty(this,'reflectee',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : {[MIRROR]:this}
        });

        this.define = (d)=>this.definitions.push(d);

        this.initialize = ()=>{
            Object.keys(this.exports).forEach(uri=>{
                this.define(new Export(this,uri,this.exports[uri]));
            });
            Object.keys(this.imports).forEach(uri=>{
                this.define(new Import(this,uri,this.imports[uri]));
            });
            
            var uri = this.uri;
            var exports = this.reflectee;
            var members = this.TEMP = scope;
            this.definitions.forEach(d=>{
                if(d instanceof Import){
                    Object.keys(d.specifiers).forEach(r=>{
                        var remote = r;
                        var local  = d.specifiers[r]=='*'?remote:d.specifiers[r];
                        Object.defineProperty(members,local,{
                            enumerable      : true,
                            configurable    : true,
                            get             : function(){
                                var module = system.loader.module(d.name);
                                console.info(module,remote);
                                return Object.defineProperty(members,local,{
                                    enumerable   : true,
                                    configurable : true,
                                    writable     : false,
                                    value        : module[remote]
                                })[local];
                            }
                        })
                    });
                }else
                if(d instanceof Export){
                    Object.keys(d.specifiers).forEach(r=>{
                        var local  = r;
                        var remote = d.specifiers[r]=='*'?r:d.specifiers[r];
                        Object.defineProperty(exports,remote,{
                            enumerable      : true,
                            configurable    : true,
                            get             : function(){
                                var value;
                                if(uri==d.name){
                                    value = scope;
                                }else{
                                    value = system.loader.module(d.name);
                                }
                                return Object.defineProperty(exports,remote,{
                                    enumerable      :true,
                                    configurable    :true,
                                    writable        :false,
                                    value           :value[local]
                                })[remote];
                            }
                        })
                    });
                }
                if(d.initialize){
                    GlobalBuilder.property(scope,d.name,d.initialize());
                }
            });
            /*
            var i;
            for(i in members){
                i = members[i];
            }
            for(i in exports){
                i = exports[i];
            }*/
            return exports;
        };
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
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'isStatic',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : isStatic
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
        this.initialize = ()=>{
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                initializer  : this.reflectee
            };
            for(var i in this){
                i= this[i]
            }
            if(this.decorators && this.decorators.length){
                this.decorators.forEach(d=>{
                    descriptor = d.call(this,this.owner.reflectee,this.name,descriptor) || descriptor;
                })
            }
            delete this.initialize;
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
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'isStatic',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : isStatic
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
        this.initialize = ()=>{
            var descriptor = {
                configurable : true,
                enumerable   : true,
                writable     : true,
                value        : this.reflectee
            };
            for(var i in this){
                i= this[i]
            }
            if(this.decorators && this.decorators.length){
                this.decorators.forEach(d=>{
                    descriptor = d.call(this,this.owner.reflectee,this.name,descriptor) || descriptor;
                })
            }
            delete this.initialize;
            return descriptor;
        }
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
    constructor(owner,name){
        super();
        Object.defineProperty(this,'owner',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : owner
        });
        Object.defineProperty(this,'name',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : name
        });
        Object.defineProperty(this,'definitions',{
            enumerable      : true,
            writable        : false,
            configurable    : false,
            value           : []
        });
        this.define = (d)=>{
            if(d instanceof Method && d.name=='constructor'){
                Class.properties.forEach(key=>{
                    var option = Object.getOwnPropertyDescriptor(d,key);
                    if(option){
                        Object.defineProperty(this,key,option);
                    }
                });
                this.reflectee[MIRROR] = this;
            }else{
                this.definitions.push(d);
            }
        };
        this.initialize = ()=>{
            var clazz = this;
            var constructor = this.reflectee;
            var initializer = ()=>{
                if(this.extends){
                    Class.extends(constructor,this.extends);
                }
                if(this.implements && this.implements.length){
                    this.implements.forEach(d=>{
                        Class.implements(constructor,d);
                    });
                }
                this.definitions.forEach(d=>{
                    if(d.isStatic){
                        GlobalBuilder.property(constructor,d.name,d.initialize());
                    }else{
                        GlobalBuilder.property(constructor.prototype,d.name,d.initialize());
                    }
                });
                if(this.decorators && this.decorators.length){
                    this.decorators.forEach(d=>{
                        constructor = d.call(this,constructor) || constructor;
                    })
                }

                for(var i in this.reflectee){
                    i=this.reflectee[i];
                }
                delete this.define;
                delete this.initialize;
                delete this.decorators;

                return constructor;
            };
            return {
                enumerable      : true,
                writable        : false,
                configurable    : true,
                initializer     : function(){
                    Object.defineProperty(this,clazz.name,{
                        enumerable      : true,
                        writable        : false,
                        configurable    : true,
                        value           : constructor
                    });
                    initializer();
                    return constructor;
                }
            };
        }
    }

}
