Object.defineProperty(global, "E56", {
  value               : {
    messages          : {
      ONE             : ''
    },
    uid               : function uid(target,uuid){
      if(!(this instanceof E56.uid)){
        if(arguments.callee === E56.uid){
          return new E56.uid(target,Math.floor(Math.random()*Number.MAX_SAFE_INTEGER));
        }else{
          return new E56.uid(target,uuid);
        }
      }else{
        if(target.uuid instanceof E56.uid){
          return target.uuid;
        }else{
          Object.defineProperties(this,{
            value   : {value:uuid},
            target  : {value:target}
          });
          Object.defineProperties(target,{
            uuid    : {value:this}
          });
          return this;
        }
      }
    },
    keys              : global.Object.keys,
    property          : function(t,k,d,D){
      if(typeof D === 'boolean' && !D){
        D=7;
      }
      if(typeof D === 'number'){
        d = {
          enumerable    : ((D & 1) <= 0) && (typeof m != "function"),
          configurable  : (D & 2) <= 0,
          writeable     : (D & 4) <= 0,
          value         : d
        }
        D = false;
      }
      return Object.defineProperty(t,k,d);
    },
    define            : function(t,d){
      return Object.defineProperties(t,d);
    },
    properties        : function(t,d){
      return Object.defineProperties(t,d);
    },
    polyfill          : function(T, M) {
      E56.keys(M).forEach(function(k){
        var m = M[k],
          d = {},
          f = m.m ? parseInt(m.m,32):0,
          t = k.charAt(0);
        var h = k.charAt(1) == ":" ? T : T.prototype;
        k = k.substring(2);
        if((f & 1)>0){
          d.enumerable = false;
        }else
        if(typeof m != "function"){
          d.enumerable = true;
        }
        d.configurable = (f & 2) <= 0;
        d.writeable = (f & 4) <= 0;
        if (t == "P") {
          if (m.v) {
            d.value = m.v();
          }
          if (m.g) {
            d.get = m.g;
          }
          if (m.s) {
            d.set = m.s;
          }
        } else if (t == "M") {
          if (typeof m == "function") {
            d.value = m;
          } else {
            d.value = m.v;
          }
        }
        E56.property(h,k,d,true);
      });
    }
  }
});


