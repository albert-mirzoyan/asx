class Sigma {
    static isFunction(target){
        return typeof target == 'function';
    }
    static isUndefined(target){
        return typeof target == 'undefined';
    }
    static accessor(target,key,value,immutable,enumerable,configurable,writable){

    }
    static constant(target,key,value,immutable=false,enumerable=true,configurable=true){
        return Sigma.property(target,key,value,immutable,enumerable,configurable,false);
    }
    static property(target,key,value,immutable,enumerable,configurable,writable){

        if(immutable && Sigma.isFunction(value)){
            var muter = {
                configurable : true,
                enumerable   : true
            };
            muter.get = Sigma.constant(function(){
                delete this[key];
                var descriptor = {
                    configurable    : Sigma.isUndefined(configurable) ? true : configurable,
                    writable        : Sigma.isUndefined(writable) ? true : writable
                };
                descriptor.value = value();
                descriptor.enumerable = Sigma.isUndefined(enumerable) ?
                    !Sigma.isFunction(descriptor.value) : enumerable;
                return Object.defineProperty(target, key, descriptor)[key]
            },'muter',true);

            if(writable){
                muter.set = Sigma.constant(function(v){
                    descriptor.value = v;
                    descriptor.enumerable = Sigma.isUndefined(enumerable) ?
                        !Sigma.isFunction(descriptor.value) : enumerable;
                    return Object.defineProperty(target, key, descriptor)[key];
                },'muter',true);
            }
            return Object.defineProperty(target, key, muter);
        }else{
            var descriptor = {
                enumerable      : Sigma.isUndefined(enumerable) ? !Sigma.isFunction(value) : enumerable,
                configurable    : Sigma.isUndefined(configurable) ? true : configurable,
                writable        : Sigma.isUndefined(writable) ? true : writable,
                value           : value
            };
            return Object.defineProperty(target, key, descriptor);
        }
    }
}

class Type {
    value:Function;
    params:Array;

    constructor(value:Function, params:Array) {
        Sigma.property(this,'value',value);
        if (params && params.length) {
            Object.defineProperty(this, 'params', {
                value: params
            });
        }
    }
}
class Scope {
    target:Definition;

    constructor(target:Definition) {
        Object.defineProperty(this, 'target', {
            value: target
        });
    }

    type(...args) {
        return new Type(...args);
    }
}
class Definition {

    name:String;
    owner:Definition;
    annotations:Array;

    constructor(name:String, definition:Object, owner:Definition = null) {
        Sigma.property(this, 'name', name);
        if (owner) {
            Sigma.property(this, 'owner', owner);
        }
        this.define(definition);
    }
    define(definition) {

    }
}
class Container extends Definition {
    scope : Object;
    defineInitializer(definition){}
    defineStaticField(name,definition){
        return this.set(new Field(true,name,definition,this));
    }
    defineStaticeMethod(name,definition){
        return this.set( new Method(true,name,definition,this));
    }
    defineClass(name,definition){
        return this.set(new Class(name, definition, this))
    }
}
class Class extends Container {
    static inherits(child, parent) {
        if (typeof parent !== 'function' && parent !== null) {
            throw new TypeError('Super expression must either be null or a function, not ' + typeof parent);
        }
        child.prototype = Object.create(parent && parent.prototype, {
            constructor       : {
                value         : child,
                enumerable    : false,
                writable      : true,
                configurable  : true
            }
        });
        if (parent){
            child.__proto__=parent;
        }
    }
    static of(Constructor){
        var Parent = Constructor.__proto__;
        var parent = Constructor.prototype.__proto__;
        var constr = Constructor.constructor;
        var definition = {};
        Object.getOwnPropertyNames(Constructor).forEach(name=>{
            var key = ':'+name;
            var def = Object.getOwnPropertyDescriptor(Constructor,name);
            definition[key]=def;
        });
        Object.getOwnPropertyNames(Constructor.prototype).forEach(name=>{
            var key = '.'+name;
            var def = Object.getOwnPropertyDescriptor(Constructor.prototype,name);
            definition[key]=def;
        });
        definition.parent = parent;
        definition.Parent = Parent;
        definition.constr = constr;
        return definition;
    }
    constructor(name:String, definition:Object, owner:Definition = null) {
        super(name, definition, owner);
    }
    define(definition){
        this.scope = Object.create(null);
        var definitions = definition.C.call(this, new Scope(this));
        this.defineConstructor(definitions['.constructor']);
        delete definitions['.constructor'];
        this.defineInitializer(definitions[':constructor']);
        delete definitions[':constructor'];
        Object.keys(definitions).forEach((name)=> {
            this.defineMember(name,definitions[name]);
        });
    }
    defineConstructor(definition){
        this.instantator = new Constructor(false,definition,this);
        Sigma.property(this,'value',()=>this.instantator.value,true);
    }
    defineMember(name,definition){
        var isStatic = false;
        if(name.charAt(0)=='.'){
            isStatic = false;
            name = name.substring(1);
        }else
        if(name.charAt(0)==':'){
            isStatic = true;
            name = name.substring(1);
        }
        if (definition.V) {
            this.defineField(isStatic,name,definition);
        } else
        if (definition.F) {
            this.defineMethod(isStatic,name,definition);
        } else
        if (definition.C) {
            this.defineClass(name,definition);
        }
    }
    defineInstanceField(name,definition){
        return this.set(new Field(isStatic,name,definition,this));
    }
    defineInstanceMethod(name,definition){
        return this.set( new Method(isStatic,name,definition,this));
    }
//mi ban ara sran
    set(member) {
        var isStatic = member.isStatic||member instanceof Class;
        var key = (isStatic?':':'.') + member.name;
        this[key] = member;
        if(isStatic){
            if(member instanceof Field){
                Sigma.property(this.value,member.name,member.accessor,true);
                Sigma.property(this.scope,member.name,member.accessor,true);
            }else{
                Sigma.property(this.value,member.name,member.value);
                Sigma.property(this.scope,member.name,member.value);
            }
        }else{
            if(member instanceof Field) {
                Sigma.property(this.value.prototype, member.name,member.accessor);
            }else{
                Sigma.property(this.value.prototype, member.name,member.value);
            }
        }
        return member;
    }
}
class Field extends Definition {
    value   : Function;
    type    : Type;
    constructor(isStatic:Boolean,name:String, definition:Object, owner:Definition = null) {
        super(name, definition, owner);
        Sigma.property(this,'isStatic',isStatic,false,true,true,false);
    }
    define(definition) {
        Sigma.property(this,'accessor',definition.V);
        Sigma.property(this,'value',definition.V,true);
        Sigma.property(this,'type',definition.T,true);
        super.define(definition);
    }

}
class Method extends Definition {

    value   :Function;
    invoke  :Function;
    type    :Type;
    constructor(isStatic:Boolean,name:String,definition:Object, owner:Definition = null) {
        super(name, definition, owner);
        Sigma.property(this,'isStatic',isStatic,false,true,true,false);
    }
    define(definition) {
        Sigma.property(this,'value',definition.F);
        Sigma.property(this,'type',definition.T,true);
        super.define(definition);
    }
}
class Module extends Container {
    imports :Object;
    exports :Object;
}

class Constructor extends Method {
    constructor(isStatic:Boolean,definition:Object, owner:Definition = null) {
        super(isStatic,'constructor',definition, owner);
    }
    define(definition) {
        Sigma.property(this,'value',definition.F);
        Sigma.property(this,'type',definition.T,true);
        Sigma.property(this.owner,'value',this.value);
    }
}
class Σ {
    static modules = {};
    static module(name, definition) {
        var module = Σ.modules[name];
        if (!module) {
            module = Σ.modules[name] = new Module(name, definition);
        }
        return module;
    }
    static initialize(global){
        console.info(global)
    }
}



