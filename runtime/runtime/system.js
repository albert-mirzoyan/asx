import {Loader} from './loader';
import {NodeLoader} from './loader';
import {BrowserLoader} from './loader';
import {MIRROR} from './mirrors';

import {globalize} from './decorators';

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
export class System {
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
    get main(){
        return this.module(this.loader.executable);
    }

    module(id){
        return this.loader.module(id);
    }

    constructor(){
        if(!global.system){
            Object.defineProperty(global,'system',{
                enumerable      : true,
                configurable    : false,
                writable        : false,
                value           : this
            });
            this.loader.load().then(m=>{
                for(var uri in this.loader.modules){
                    var mirror = system.loader.module(uri)[MIRROR];
                    if(mirror && typeof mirror.initialize == 'function'){
                        mirror.initialize();
                    }
                }
                //console.info(m.default);
            });
        }
        return global[global.system];
    }
}
