function convertClassDefinition(def){
    var SC = def[':constructor'];
    var IC = def['.constructor'];
    delete def[':constructor'];
    delete def['.constructor'];
    var clazz = new Class(IC.F);
    Object.keys(def).forEach(key=>convertClassMember(key,def));
    if (IC.E) {
        clazz.extend(IC.E);
    }
    return clazz;
}
function convertClassMember(key,def){
    var member = def[key];
    member.name = key.substring(1);
    member.static = key[0] == ':';
    if (member.F) {
        member.kind = 'method';
        member.value = member.F;
        delete member.F;
    } else {
        member.kind = 'field';
        member.value = member.V;
        delete member.V;
    }
    if (member.T) {
        member.type = Type.get(member.T);
        delete member.T;
    }
    console.info(member);
}
class Type {
    static get(type){
        return new Type(type)
    }
    constructor(type){
        if(typeof type=='function'){
            this.value = type;
        }else
        if(Array.isArray(type)){
            this.value = type.shift();
            if(type.length){
                this.params = type.filter(r=>Type.get(r));
            }
        }
    }
}
class Class {
    static define(def) {
        var clazz = null;
        def(def=>clazz=convertClassDefinition(def));
        console.info(clazz);
        return clazz.mirror;
    }

    mirror:Function;
    parent:Function;

    constructor(mirror) {
        Object.defineProperty(this, 'mirror', {
            value: mirror
        });
        Object.defineProperty(mirror, 'class', {
            value: this
        })
    }

    extend(parent) {
        Object.defineProperty(this, 'parent', {
            configurable: true,
            value: parent
        });
    }

    member(member) {
        var name = member.name;
        var name = member.name;
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
        Object.defineProperty(this.scope, name, {
            configurable: true,
            get: function () {
                return Object.defineProperty(this, name, {
                    value: Class.define(definer)
                })[name];
            }
        })
    }

    export(definer) {
        this.exports = {};
        for (var name in definer) {
            Object.defineProperty(this.exports, name, {
                configurable: true,
                get: function () {
                    return Object.defineProperty(this, name, {
                        value: definer[name]()
                    })[name];
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
                console.info(module.exports['#']);
            });
        }
    }
}



Runtime.execute();


