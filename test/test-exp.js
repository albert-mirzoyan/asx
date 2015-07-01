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



Module.define('asx/test/config',{
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

μ(function asxˏtestˏconfigꓸjs(){with(this){
    ʃꜜ({
        asx    : {
            testˏsimpleˑtestꓸjs:{

            }
        }
    });
    ʃꜛ({
        asx    : {
            testˏsimpleˑtestꓸjs:{

            }
        }
    });
    ʃᵐ(function defaultᵐ(){

    });
    ƒᵐ(function executeᵐ(){

    });
    ʃᵐ(function myField(){});
    ƒᵐ(function myMethod(){});
    ʈᵐ(function MyClassᶜ(){with(this){
        ʈⁱ(function MyClass(){

        },[
            function ᵗʸᵖᵉ   (){

            },
            function ᵃʳᵍˢ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            }
        ]);
        ʃⁱ(function myField(){},[
            function ᵗʸᵖᵉ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            },
            function ᵍᵉᵗᵗᵉʳ (){

            },
            function ˢᵉᵗᵗᵉʳ (){

            }
        ]);
        ƒⁱ(function myMethod(){

        },[
            function ᵗʸᵖᵉ   (){

            },
            function ᵃʳᵍˢ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            }
        ]);
        ʈˢ(function MyClassˢ(){},[
            function ᵗʸᵖᵉ   (){

            },
            function ᵃʳᵍˢ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            },
            function ᵖᵃʳᵉⁿᵗ (){

            }
        ]);
        ʃˢ(function myField(){
            return 56
        },[
            function ᵗʸᵖᵉ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            },
            function ᵍᵉᵗᵗᵉʳ (){

            },
            function ˢᵉᵗᵗᵉʳ (){

            }
        ]);
        ƒˢ(function myMethod(){

        },[
            function ᵗʸᵖᵉ   (){

            },
            function ᵃʳᵍˢ   (){

            },
            function ᵈᵉᶜᵒʳˢ (){

            },
            function ᵖᵃʳᵉⁿᵗ (){

            }
        ]);
    }});
}});


ǀǃˉꓽꓸꓺˑॱꜛꜜ＿Ʃʃƒˏʈςμ();

ॱ(a,'b',5);


ˉᴿᵂ()


ᴬᴮᴰᴱᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᴿᵀᵁⱽᵂ();

this.hello.world = other.gago(a+5+58).jan;
ᵂ(this,'value.hello',ᴿ(ᴱ(ᴿ(other,'gago'),ˢᵘᵐ(a,5,58)),'jan'));

ᴿ(property,'value');
ᵂ(property,'value');

ˢᵘᵇ();
ˢᵘᵐ();
ᵈⁱᵛ();
ᵐᵘˡ();
ˡˢʰ();
ⁿᵒᵗ();

ˡᵒʳ();
ˣᵒʳ();
ᵇᵒʳ();

ᵃⁿᵈ();
ᵇⁿᵈ();



ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖʳˢᵗᵘᵛʷˣʸᶻᵅᵝᵞᵟᵋᶿᶥᶲᵠᵡ();