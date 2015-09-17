export function constant(target){}
export function globalize(name,instantate){
    if(name instanceof Function){
        Object.defineProperty(global,name.name,{
            enumerable   : true,
            writable     : false,
            configurable : false,
            value        : name
        });
    }else{
        return function(target){
            Object.defineProperty(global,name,{
                enumerable   : true,
                writable     : false,
                configurable : false,
                value        : instantate?new target:target
            });
        }
    }
}