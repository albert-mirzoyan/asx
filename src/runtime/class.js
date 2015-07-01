function traits(...traits){
    return (target)=>{
        traits.forEach(trait=>{
            Object.getOwnPropertyNames(trait.prototype).forEach(key=>{
                if(key!='constructor') {
                    Object.defineProperty(target.prototype, key, Object.getOwnPropertyDescriptor(trait.prototype, key));
                }
            });
        });
        return target;
    }
}
function immutable(target,name,descriptor){
    return Object.defineProperty(target,name,{
        configurable  : descriptor.configurable,
        enumerable    : descriptor.enumerable,
        get           : function(){
            delete this[name];
            return Object.defineProperty(this,name,{
                configurable  : descriptor.configurable,
                enumerable    : descriptor.enumerable,
                writable      : descriptor.writable,
                value         : descriptor.initializer()
            })[name];
        }
    })
}
function property(target,name,descriptor){
    return Object.defineProperty(target,name,{
        configurable  : descriptor.configurable,
        enumerable    : descriptor.enumerable,
        get           : function(){
            delete this[name];
            return Object.defineProperty(this,name,{
                configurable  : descriptor.configurable,
                enumerable    : descriptor.enumerable,
                writable      : descriptor.writable,
                value         : descriptor.initializer()
            })[name];
        }
    })
}

class Emitter {
    @immutable
    listeners:Object = {};
    on(name,callback,context,once=false){
        if(!name){
            name = '*';
        }
        var handler;
        if(context){
            handler = callback.bind(context);
        }else{
            handler = callback.bind(this);
        }
        handler.callback = callback;
        handler.once = once;
        var handlers = this.listeners[name];
        if(!handlers){
            handlers = this.listeners[name] = [handler];
        }else{
            handlers.push(handler);
        }
        return this;
    }
    once(name,callback,context){
        return this.on(name,callback,context,true);
    }
    emit(name,...args){
        var i,handler,handlers;

        handlers = this.listeners[name];
        if(handlers && handlers.length){
            for(i=0;i<handlers.length;i++){
                handler = handlers[i];
                if(handler.context==this){
                    handler(...args);
                }else{
                    handler([...args,this]);
                }

                if(handler.once){
                    handlers.splice(i--,1);
                }
            }
        }
        handlers = this.listeners['*'];
        if(handlers && handlers.length){
            for(i=0;i<handlers.length;i++){
                handler = handlers[i];
                if(handler.context==this){
                    handler(...args);
                }else{
                    handler([...args,this]);
                }
                if(handler.once){
                    handlers.splice(i--,1);
                }
            }
        }
        return this;
    }
    off(name,callback){
        if(!name) {
            this.listeners={};
        }else{
            if(callback){
                var i,handlers;
                handlers = this.listeners[name];
                if(handlers && handlers.length){
                    for(i=0;i<handlers.length;i++){
                        if(handlers[i].callback == callback){
                            handlers.splice(i--,1);
                        }
                    }
                }
                handlers = this.listeners['*'];
                if(handlers && handlers.length){
                    for(i=0;i<handlers.length;i++){
                        if(handlers[i].callback == callback){
                            handlers.splice(i--,1);
                        }
                    }
                }
            }else{
                delete this.listeners[name];
            }
        }
        return this;
    }
}


class Definition {

}
class Field extends Definition{

}

class Method extends Definition{

}

class Constructor extends Method {

}

@traits(Emitter)
class Class {
    static ON = {
        CHANGE : 'change'
    };

    @property instantator:Constructor = new Constructor();

    get name(){
        return this.instantator.value;
    }
    set name(v){
        this.instantator.name = v;
    }
    get value(){
        return this.instantator.value;
    }
    set value(v){
        this.instantator.value = v;
    }

}

console.info(new Class());