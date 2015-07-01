
export class Hello {
    static
    property:String = '565';
    property:String = '565';

    static
    constructor(a:String,b:Other,...c:String):Hello{}
    constructor(a:String,b:Other,...c:String):Hello{

    }

    get hello(){

    }

    static
    method(a:String,b:Other=Hello.property,...c:String):String{
        this
    }
    method(a:String,b:Other=this.p,...c:String):String{
        return this.other;
    }
    other(a:String,b:Other=this.p,...c:String):String{
        return this.p;
    }
}

var hello = new Hello();
hello.method();

asset(hello instanceof Hello);
Hello.method();

///---------

