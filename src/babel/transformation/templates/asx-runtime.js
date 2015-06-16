(function () {
  var global  = this;
  var locker  = {};
  var modules = Object.create(null);
  function Definer(module){
    if(this.defineClass){
      this.c$ = this.defineClass.bind(module);
    }else{
      this.c$ = this.definePolyfill.bind(module);
    }
  }
  Definer.prototype.definePolyfill = function defineClass(def){
    var name = def.name.substring(2);
    var self  = this;
    var scope = this.scope;
    function declare(D) {
      var C = D['#constructor'];
      var I = D['#initializer'];
      var P = D['#extend'];
      var N = D['#override'];
      var A = D['#decorators'];

      if(!C){
        C = global[name];
      }

      if(N){
        switch(N){
          case 'local':Object.defineProperty(scope,name,{
            configurable:true,
            value : C = (C||scope[name])
          })
            break;
          case 'global':Object.defineProperty(global,name,{
            configurable:true,
            value : C = (C||global[name])
          })
            break;
        }
      }

      C['#decorators'] = {};
      if(I){
        C['#initializer'] = I;
      }
      if(A){
        A = A.filter(function(a){return !!a})
        if(A.length){
          C['#decorators']['#'] = A;
        }
      }
      if(P){
        extend(C, P);
      }

      Object.keys(D).forEach(function (k) {
        var x = {configurable:true,writable:true};
        var h,o;
        var d = D[k];
        var a = d['#a'];
        var s = k.charAt(0);
        var n = k.substring(1);
        if(a){
          a = a.filter(function(a){return !!a});
          if(a.length){
            C['#decorators'][k] = a;
          }
        }
        if (s == '.' || s == ':') {
          h = s == ':' ? C : C.prototype;
          d['#o'] = Object.getOwnPropertyDescriptor(h, n);
          if (d['#f']) {
            x.value = d['#f'];
            x.enumerable = false;
            x.writable = true;
            x.value.definition = d;
          } else if (d['#v'] || d['#g'] || d['#s']) {
            delete x.writable;
            x.enumerable = true;
            if (d['#g'] || d['#s']) {
              if (d['#g']) {
                x.get = d['#g'];
                x.get.definition = d;
              }
              if (d['#s']) {
                x.set = d['#s'];
                x.set.definition = d;
              }
            } else {
              if (d['#v']) {
                x.configurable=true;
                x.get = function value_getter() {
                  delete this[n];
                  return Object.defineProperty(this,n,{
                    writable:true,
                    enumerable:true,
                    configurable:true,
                    value : d['#v']()
                  })[n];
                };
                x.set = function value_setter(v) {
                  delete this[n];
                  return Object.defineProperty(this,n,{
                    writable:true,
                    enumerable:true,
                    configurable:true,
                    value : v
                  })[n];
                };
                x.get.definition = d;
                x.set.definition = d;
              }
            }
          } else {}

          Object.defineProperty(h, n, x);
        }
      });

      if(Object.keys(C['#decorators']).length<=0){
        delete C['#decorators'];
      }
      return C;
    }
    function extend(d, b) {
      /*Object.getOwnPropertyNames(b).forEach(p=>{
        if(!Object.getOwnPropertyDescriptor(d,p)) {
          Object.defineProperty(d, b, Object.getOwnPropertyDescriptor(b, p));
        }
      })*/
      for (var p in b){
        if (d.hasOwnProperty(p)){
          d[p] = b[p];
        }
      }
      //d.__proto__ = b.__proto__;
      function __() {
        this.constructor = d;
      }
      __.prototype = b.prototype;
      d.prototype = new __();
    }
    function definer(){
      var s = {};
      var c = declare(def(s));
      if(c.class && c.class.initialize){
        c.class.initialize(s,self);
      }
      return Object.defineProperty(this,name,{
        value : c
      })[name];
    }
    if(this.scope.hasOwnProperty(name)){
      //console.info(name)
      Object.defineProperty(this.scope,name,{
        configurable  : true,
        value         : definer.call(this.scope)
      })
    }else{
      Object.defineProperty(this.scope,name,{
        configurable  : true,
        get           : definer
      })
    }
  };

  function Module(lock,id){
    if(lock != locker){
      throw new Error("Module '"+id+"' can't be instantiated directly");
    }else
    if(modules[id]){
      throw new Error("Module '"+id+"' already defined");
    }else{
      Object.defineProperty(this,'id',{value:id});
      Object.defineProperty(modules,id,{
        configurable : false,
        writable     : false,
        enumerable   : true,
        value        : this
      });
      this.prepare();
    }
  }
  Module.get = function(id){
    id = this.normalize(id);
    if(modules[id]){
      return modules[id];
    }else{
      return new Module(locker,id);
    }
  }
  Module.normalize = function normalize(name){
    var id = name;
    id = id.replace(/^(.*)\.js$/, '$1');
    id = id.split('/').filter(p=>p.match(/^[A-Z][A-Z0-9_\-]*$/i));
    if(id.length<2){
      throw new Error('Invalid Module Id '+name);
    } else
    if(id.length==2){
      id.push('index');
    }
    return id.join('/');
  }
  Module.prototype.prepare      = function prepare(){
    this.scope = {
      Module   : Module,
      Runtime  : Runtime,
      Asx      : Runtime.Asx
    }
  };
  Module.prototype.initialize   = function initialize(def){
    def = def.bind(this.scope)(this);
    this.imports = def.imports;
    this.exports = def.exports;
    this.definer = def.execute;
    this.doImports();
    return this;
  };
  Module.prototype.doImports    = function doImports(){
    delete this.imports;
    this.doExecute();
  }
  Module.prototype.doExecute    = function doExecute(){
    Object.defineProperty(this,'exports',{
      value : this.definer.call(this.scope,new Definer(this))
    })
    delete this.definer;
    this.doExports();
  }
  Module.prototype.doExports    = function doExports(){
    this.finalize();
  }
  Module.prototype.finalize     = function finalize(){
    if(this.onComplete){
      var onComplete = this.onComplete;
      delete this.onComplete;
      onComplete();
    }
  }

  function Runtime(){
    if(!global.Asx){
      if(typeof require == 'function'){
        Object.defineProperty(this,'require',{
          value:require
        });
      }
      Object.defineProperty(this,'modules',{
        value:modules
      });
      Object.defineProperty(Runtime,'global',{
        value:global
      });
      Object.defineProperty(Runtime,'Asx',{
        value:this
      });
      Object.defineProperty(global,'Asx',{
        value:this
      });
      return this;
    }else{
      return global.Asx;
    }
  }
  Runtime.prototype.define    = function define(name,def){
    return Module.get(name).initialize(def);
  }
  return new Runtime();
})();
