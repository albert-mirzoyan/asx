(function module(){
  var global = this;
  var locker = {'ns':'private'};

  var extend = function extend(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
  };
  var define = function define(D){
    var C = D['*:new'],P=D['*:extend'],S=D['*:static'];
    if(P){
      extend(C,P);
    }
    Object.keys(D).forEach(function(k){
      var d=D[k],t=k.charAt(0).toUpperCase();
      var s=k.charAt(1),n=k.substring(2);
      var h=(s==':')?C:C.prototype;
      switch(t){
        case 'F' :
          Object.defineProperty(h,n,{
            configurable : true,
            value        : d
          });
          break;
        case 'V' :
          Object.defineProperty(h,n,{
            configurable : true,
            value        : d
          });
          break;
        case 'G' :
        case 'S' :
          var pd = Object.getOwnPropertyDescriptor(h,n)
          pd = pd || {
              configurable : true
            };
          switch(t){
            case 'G': pd.get = d; break;
            case 'S': pd.set = d; break;
          }
          Object.defineProperty(h,n,pd);
          break;
      }
    });
    if(S){
      S.call(C);
    }
    return C;
  };
  // classes
  var Runtime       = define({
    '*:new'            : function Runtime(){

    }
  });
  var Scope         = define({
    '*:new'           : function Scope(){},
    'f.export'        : function exports(exports){
      //console.log(exports);
    },
    'f.declare'       : function declare(declaration){
      if(declaration.now){
        return Object.defineProperty(this,declaration.name,{
          configurable : true,
          value        : declaration.done()
        })[declaration.name];
      }else{
        if(!Object.getOwnPropertyDescriptor(this, declaration.name)){
          Object.defineProperty(this, declaration.name, {
            configurable : true,
            get: function get() {
              return Object.defineProperty(this, declaration.name, {
                configurable : true,
                value        : declaration.done()
              })[declaration.name];
            }
          });
        }else{
          return Object.defineProperty(this,declaration.name,{
            configurable : true,
            value        : declaration.done()
          })[declaration.name];
        }
      }
    },
    'f.done'          : function done(){
      delete this.declare;
      delete this.export;
      delete this.done;
    }
  });
  var Member        = define({
    '*:new'               : function Member(ns,owner,key,def){
      if(locker !== ns){
        throw new Error('should not call direct constructor');
      }
      this.modifiers = 0;
      this.owner = owner;
      this.key = key;
      this.name = Member.toName(key);
      if(Member.isStatic(key)){
        this.modifiers |= Member.STATIC;
      }else{
        this.modifiers &= ~Member.STATIC;
      }
      if(this.owner.parent){
        var parent = this.owner.parent.member(this.key);
        if(parent){
          this.parent = parent;
          this.modifiers |= Member.EXTENDED;
        }else{
          delete this.parent;
          this.modifiers &= ~Member.EXTENDED;
        }
      }
      if(!def){
        this.modifiers |= Member.NATIVE;
        this.original  = Member.descriptor(owner,key);
        this.modifiers |= Member.modifiers(this.original);
        if(this.original.hasOwnProperty('value')){
          this.value = this.original.value;
        }else{
          if(this.original.hasOwnProperty('get')){
            this.getter = this.original.get;
          }
          if(this.original.hasOwnProperty('get')){
            this.setter = this.original.set;
          }
        }
      }else{
        this.modifiers &= ~Member.NATIVE;
        this.update(def);
      }
    },
    'f:HIDDEN'            : 1,
    'f:FINAL'             : 2,
    'f:CONSTANT'          : 4,
    'f:NATIVE'            : 8,
    'f:STATIC'            : 16,
    'f:EXTENDED'          : 32,
    'f:toName'            : function toName(key){
      if(!key.match(/(:|\.)[A-Za-z0-9_$]+/i)){
        throw new Error('Invalid member name '+key);
      }else{
        return key.substring(1);
      }
    },
    'f:modifiers'         : function modifiers(descriptor){
      var modifiers = 0;
      if(!descriptor.enumerable){
        modifiers |= Member.HIDDEN;
      }else{
        modifiers &= ~Member.HIDDEN;
      }
      if(!descriptor.configurable){
        modifiers |= Member.FINAL;
      }else{
        modifiers &= ~Member.FINAL;
      }
      if(!descriptor.writable){
        modifiers |= Member.CONSTANT;
      }else{
        modifiers &= ~Member.CONSTANT;
      }
      return modifiers;
    },
    'f:descriptor'        : function descriptor(clazz,key){
      var name = Member.toName(key);
      if(['constructor','prototype'].indexOf(name)<0){
        return Object.getOwnPropertyDescriptor(
          Member.isStatic(key)
            ? clazz.constructor
            : clazz.constructor.prototype
          , Member.toName(key)
        );
      }

    },
    'f:get'               : function get(clazz,key){
      var member = clazz[key];
      if(!member){
        var d = Member.descriptor(clazz,key);
        if(d){
          if(typeof d.value =='function'){
            member = new Method(locker,clazz,key);
          }else{
            member = new Field(locker,clazz,key);
          }
          clazz[key]=member;
        }
      }
      return member;
    },
    'f:set'               : function set(clazz,key,def){
      if(typeof def == 'function'){
        def = {'#f':def}
      }else
      if(!(def.hasOwnProperty('#f')||def.hasOwnProperty('#v'))){
        def = {'#v':def}
      }
      if(def.hasOwnProperty('#f')){
        return clazz[key] = new Method(locker,clazz,key,def);
      }else
      if(def.hasOwnProperty('#v')){
        return clazz[key] = new Field(locker,clazz,key,def);
      }
    },
    'f:isHidden'          : function isHidden(member){
      return !!(member.modifiers&Member.HIDDEN);
    },
    'f:isFinal'           : function isFinal(member){
      return !!(member.modifiers&Member.FINAL);
    },
    'f:isConstant'        : function isConstant(member){
      return !!(member.modifiers&Member.CONSTANT);
    },
    'f:isStatic'          : function isStatic(member){
      if(typeof member=='string'){
        return member.charAt(0)==':';
      }else{
        return !!(member.modifiers&Member.STATIC);
      }
    },
    'f:isNative'          : function isNative(member){
      return !!(member.modifiers&Member.NATIVE);
    },
    'f:isExtended'        : function isExtended(member){
      return !!(member.modifiers&Member.EXTENDED);
    },
    'f:holder'            : function holder(member){
      if(Member.isStatic(member)){
        return member.owner.constructor;
      }else{
        return member.owner.constructor.prototype;
      }
    },
    'f.update'            : function update(def){
      var d = {};
      if(typeof def=='function'){
        def = {'#f':def}
      }
      if(def.hasOwnProperty('#m')){
        this.modifiers |= def['#m'];
      }
      if(def.hasOwnProperty('#a')){
        this.decorators = def['#a'].filter(d=>!!d);
      }
      if(!Member.isHidden(this)){
        d.enumerable = true;
      }
      if(!Member.isFinal(this)){
        d.configurable = true;
      }
      if(!Member.isConstant(this)){
        d.writable = true;
      }
      if(def.hasOwnProperty('#f')){
        this.value = d.value = def['#f'];
      }else
      if(def.hasOwnProperty('#v') && (typeof def['#v']!='undefined')){
        this.value = d.value = def['#v'];
      }
      if(def.hasOwnProperty('#g')){
        delete d.value;
        delete d.writable;
        this.getter = d.get = def['#g'];
      }
      if(def.hasOwnProperty('#s')){
        delete d.value;
        delete d.writable;
        this.setter = d.set = def['#s'];
      }
      Object.defineProperty(Member.holder(this),this.name,d);
      this.modifiers |= Member.modifiers(Member.descriptor(this.owner,this.key));
    },
    'f.decorate'          : function decorate(){
      if(this.decorators){
        this.decorators.forEach(d=>{
          if(typeof d=='function'){
            d(this);
          }
        })
      }
    },
    'f.supers'            : function supers(holder,target){
      if(this instanceof Method){
        Object.defineProperty(holder,this.name,{
          value:this.value.bind(target)
        })
      }else{
        var setter,getter,value,name=this.name;
        if(this.original){
          setter = this.original.set;
          getter = this.original.get;
          value  = this.original.value;
        }else{
          setter = this.setter;
          getter = this.getter;
          value  = this.value;
        }

        var proxy = {};
        if(getter || setter){
          if(getter){
            proxy.get = getter.bind(target);
          }
          if(setter){
            proxy.set = setter.bind(target);
          }
        }else{
          proxy.get = function getter(){
            return Object.defineProperty(this,name,{
              enumerable    : true,
              configurable  : true,
              writable      : true,
              value         : value
            })[name];
          }.bind(target);
          proxy.set = function setter(v){
            return Object.defineProperty(this,name,{
              enumerable:true,
              configurable:true,
              writable:true,
              value : v
            })[name];
          }.bind(target);
        }
        Object.defineProperty(holder,name,proxy);
      }
    },
    'f.toString'          : function toString(){
      var str = [];
      if(Member.isNative(this)){
        str.push('native');
      }
      if(Member.isStatic(this)){
        str.push('static');
      }
      if(Member.isExtended(this)){
        str.push('extended');
      }
      if(Member.isConstant(this)){
        str.push('constant');
      }
      if(Member.isFinal(this)){
        str.push('final');
      }
      if(Member.isHidden(this)){
        str.push('hidden');
      }
      str.push(this.owner.name+this.key);
      if(this.parent){
        str.push(':')
        str.push(this.parent.owner.name+this.parent.key);
      }

      return '['+str.join(' ')+']';
    }
  });
  var Field         = define({
    '*:extend'            : Member,
    '*:new'               : function Field(ns,owner,key,def){
      Member.call(this,ns,owner,key,def);
      //this.value = def.v;
      //console.info(this)
    }
  });
  var Method        = define({
    '*:extend'            : Member,
    '*:new'               : function Method(ns,owner,key,def){
      Member.call(this,ns,owner,key,def);
      //this.value = def.v;
      //this.getter = def.g;
      //this.value = def.v;
      //console.info(this)
    }
  });
  var Class         = define({
    '*:new'         : function Class(constructor){
      if(!(this instanceof Class)){
        return new Class(constructor);
      } else
      if(typeof constructor=='function'){
        var desc =Object.getOwnPropertyDescriptor(constructor,'class');
        if(desc && (desc.value instanceof Class)){
          return desc.value;
        }
        //Object.defineProperty(this,'uuid',{value:Class.uid()});
        Object.defineProperty(this,'native',{
          value : global[constructor.name]==constructor
        });
        Object.defineProperty(this,'constructor',{
          value : constructor
        });
        if(this.native){
          var clazz = this;
          Object.getOwnPropertyNames(constructor).forEach(function(key){
            clazz.getMember(':'+key);
          })
          Object.getOwnPropertyNames(constructor.prototype).forEach(function(key){
            clazz.getMember('.'+key);
          })
        }
      }
    },
    'v:classes'       : {},
    'f:extend'        : extend,
    'f:uid'           : function uid(){
      return [
        'C:',
        (Math.round(Math.random() * 0xFFFFFF)).toString(32),
        (Math.round(Math.random() * 0xFFFFFF)).toString(32),
      ].join('');
    },
    'f.update'        : function update(D,defaults){
      var c = this;
      var C = this.constructor;
      var P = D['#extend'];
      var a = D['#decorators'];
      if(P){
        extend(C,P);
      }
      if(a){
        Object.defineProperty(this,'decorators',{
          configurable  : true,
          value         : a.filter(d=>!!d)
        })
      }
      Object.keys(D).forEach(function(k){
        if(k.match(/(:|\.)[A-Za-z0-9_$]+/i)){
          c.setMember(k,D[k]);
        }
      });

      if(defaults){
        this.decorate();
        this.defaults();
      }
    },
    'g.name'          : function name_getter(){
      return Object.defineProperty(this,'name',{
        enumerable    : true,
        configurable  : true,
        writable      : false,
        value         : this.constructor.name
      }).name;
    },
    'g.parent'        : function parent_getter(){
      if(this.constructor == Object){
        return Object.defineProperty(this,'parent',{
          enumerable    : false,
          value         : false
        }).parent;
      }else{
        return Object.defineProperty(this,'parent',{
          enumerable    : false,
          configurable  : true,
          value         : Object.getPrototypeOf(this.constructor.prototype).constructor.class
        }).parent;
      }
    },
    'f.hasMember'     : function hasMember(key){
      return Member.get(this,key) instanceof Member;
    },
    'f.getMember'     : function getMember(key){
      return Member.get(this,key);
    },
    'f.addMember'     : function addMember(key,def){
      return Member.set(this,key,def);
    },
    'f.setMember'     : function setMember(key,def){
      if(this.hasMember(key)){
        return this.getMember(key).update(def)
      }else{
        return this.addMember(key,def);
      }
    },
    'f.member'        : function get(key){
      if(this[key]){
        return this[key];
      }else
      if(this.parent){
        return this.parent[key];
      }
    },
    'f.members'       : function members(filter){
      return Object.keys(this)
      .map((key)=>{
        if(this[key] instanceof Member){
          if((typeof filter =='function')){
            if(filter(this[key])){
              return this[key]
            }
          }else{
            return this[key];
          }
        }
      })
      .filter((a)=>{
        return (a instanceof Member)
      });
    },
    'f.decorate'      : function decorate(){
      this.members().forEach(m=>m.decorate());
      if(this.decorators){
        this.decorators.forEach(d=>{
          if(typeof d =='function'){
            d(this);
          }
        })
      }
    },
    'f.defaults'      : function defaults(target){
      var members;
      if(!target){
        target = this.constructor;
        members = this.members(m=>((m instanceof Field) && Member.isStatic(m)));
      }else{
        members = this.members(m=>((m instanceof Field) && !Member.isStatic(m)));
      }
      members.forEach(m=>{
        if(typeof m.value=='function'){
          target[m.name] = m.value.call(target);
        }
      })
    },
    'f.supers'        : function suppers(target,...fields){
      var members,binding;
      if(target == this.constructor){
        binding = this.parent.constructor.bind(target); // should be statics ?
        members = this.members(m=>(Member.isStatic(m) && fields.indexOf(m.name)>=0));
      }else
      if(target instanceof this.constructor){
        binding = this.parent.constructor.bind(target);
        members = this.members(m=>(!Member.isStatic(m) && fields.indexOf(m.name)>=0));
      }
      members.forEach(m=>m.parent.supers(binding,target));
      return binding;
    },
    'f.toString'      : function toString(){
      return '['+(this.native?'native ':'')+'class '+this.name+']'
    }
  });
  var Module        = define({
    '*:new'           : function Module(){},
    '*:static'        : function static(){
      Object.defineProperty(Function.prototype,'class',{
        configurable  : true,
        get           : function(){
          return Object.defineProperty(this,'class',{
            configurable  : true,
            enumerable    : false,
            writable      : false,
            value         : Class(this)
          }).class;
        }
      });
      Object.defineProperty(Class.prototype,'class',{
        enumerable    : false,
        writable      : false,
        configurable  : false
      });
      Object.defineProperty(Object.prototype,'class',{
        configurable  : true,
        get           : function(){
          return Object.defineProperty(this,'class',{
            writable      : true,
            configurable  : true,
            value         : this.constructor.class
          }).class;
        }
      });
    },
    'f.scope'         : function scope(path){
      Object.defineProperty(this,'path',{value:path});
      Object.defineProperty(this,'scope',{value:new Scope()});
      return this.scope;
    },
    'f.define'        : function define(definer){
      var scope = this.scope;
      if(definer['#imports']){
        var imports   = definer['#imports'];
        var entities  = {
          'Runtime'       : Runtime,
          'Module'        : Module,
          'Class'         : Class,
          'ClassFunction' : Field,
          'ClassVariable' : Method
        };
        Object.keys(imports).forEach(function(key){
          if(key=='runtime'){
            var runtime = imports['runtime'];
            if(runtime['*']=='*'){
              Object.keys(entities).forEach(function (key) {
                scope.declare({
                  now: true,
                  name: key,
                  done: function () {
                    return entities[key]
                  }
                })
              })
            } else {
              Object.keys(runtime).forEach(function (key) {
                var named = runtime[key] == '*' ? key : runtime[key];
                if (entities.hasOwnProperty(key)) {
                  return scope.declare({
                    now: true,
                    name: named,
                    done: function () {
                      return entities[key]
                    }
                  })
                }
              })
            }
          }
        });
      }
      if(definer){
        Object.keys(definer).forEach(function(key){
          var opts = definer[key];
          var type = key.charAt(0);
          var name = key.substring(1);
          if(type=='.'){
            scope.declare({
              name : name,
              opts : opts,
              done : function(){
                var csc = {}
                var def = this.opts(csc);
                def['#name'] = this.name;
                var cls = def['#new'].class;
                csc.supers = cls.supers.bind(cls);
                csc.defaults = cls.defaults.bind(cls);
                cls.update(def,true);
                return cls.constructor;
              }
            });
          }else
          if(type==':'){
            scope.declare({
              name : name,
              opts : opts,
              done : function(){
               return opts;
              }
            });
          }else
          if(type!='#'){
            throw new Error('Unknown definition type '+type);
          }
        });
      }
      if(definer['#new']){
        definer['#new'].call(this.scope);
      }
      if(definer['#export']){
        this.export(definer['#export']);
      }
      return this.done();
    },
    'f.export'        : function exports(exports){
      Object.defineProperty(this,'public',{
        value : this.scope.export(exports)
      });
    },
    'f.done'          : function done(){
      this.scope.done();
      delete this.declare;
      delete this.define;
      delete this.export;
      delete this.done;
    }
  });

  return new Module();
})()




