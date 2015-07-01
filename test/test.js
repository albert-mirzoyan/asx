Σ.module('asx/test/config',{
    I:{
        'module/path':{
            'Object':'Alias'
        }
    },
    E:{
        'module/path':{
            'Object':'Alias'
        }
    },
    C:function(Σ){with(this.scope){return {
        ':default'   : {
            A: function(){return [String]},
            T: function(){return Σ.type(Hello);},
            V: function(){
                return new Hello('Hello','world');
            }
        },
        ':method'    : {
            A: function(){return [String]},
            T: function(){
                return Σ.type(String);
            },
            P: function(){return {
                a:[0,Asx.type(String)],
                b:[0,Asx.type(Object),function () {
                    return Hello.property;
                }],
                c:[1,Asx.type(String)]
            }},
            F: function(){
                console.info("I am method")
            }
        },
        ':property'  : {
            A: function(){return [String]},
            T: function(){
                return Σ.type(String);
            },
            V: function(){
                return '565';
            }
        },
        ':Hello'     : {
            A: function(){return [String]},
            C: function(Σ){with(this.scope){return {
                ':instantator' : {
                    A: function(){return [String]},
                    T: function(){
                        return Σ.type(Hello);
                    },
                    F: function Hello(a, b) {
                        this.a = a;
                        this.b = b;
                    },
                    E: function(){
                        return Array;
                    }
                },
                '.initializer' : {
                    T: function(){
                        return Σ.type(Hello);
                    },
                    F: function Hello(a, b) {
                        this.a = a;
                        this.b = b;
                    },
                    E: function(){
                        return Parent;
                    }
                },
                ':property'    : {
                    T: function(){
                        return Σ.type(String);
                    },
                    V: function(){
                        return '565';
                    }
                },
                ':method'      : {
                    F: function(a){
                        var b = arguments[1] === undefined ? Hello.property : arguments[1];
                    },
                    T: function(){
                        return Σ.type(String);
                    },
                    A: function(){
                        return [String]
                    },
                    P: function(){
                        return {
                            a: Asx.arg(Asx.type(String)),
                            b: Asx.arg(Asx.type(Object), function () {
                                return Hello.property;
                            }),
                            c: Asx.arg(Asx.type(String)).rest
                        }
                    }
                },
                '.property'    : {
                    T: function(){
                        return Σ.type(String);
                    },
                    V: function(){
                        return '565';
                    }
                },
                '.method'      : {
                    A: function(){
                        return [String]
                    },
                    T: function(){
                        return Σ.type(String);
                    },
                    P: function method(){
                        return {
                            a: Asx.arg(Asx.type(String)),
                            b: Asx.arg(Asx.type(Object), function () {
                                return Hello.property;
                            }),
                            c: Asx.arg(Asx.type(String)).rest
                        }
                    },
                    F: function(a){
                        var b = arguments[1] === undefined ? Hello.property : arguments[1];
                    }
                }
            }};}
        }
    }}}
});

var module = Σ.module('asx/test/config');
console.info(module);
