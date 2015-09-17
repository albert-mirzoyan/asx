export const
    one  :String='ONE',
    two  :String='TWO',
    tree :String='TREE';

export function decor(a,b,c):String{

}

@decor
export class Model {
    id : String = 'M1';

    constructor(id=this.id):Model{
        this.id = id;
    }

    @decor static field:String = 'Hehe';
    @decor static method(a,b,c):String{}
    @decor field:String = 'Hello';
    @decor method(a,b,c):String{}
    callMe(param){
        console.info(param)
    }
}

@decor
export class User extends Model {
    static gago(){}
    id      : String = 'U1';
    name    : String = 'Sergey Mamyan';
    email   : String = 'sergey.mamyan@gmail.com';
    constructor(id=this.id, name=this.name, email=this.email){
        super(id);
        this.name   = name;
        this.email  = email;
    }

}

@decor
export class Post extends Model {

    id      : String    = 'P1';
    owner   : User      = new User(this.id+'/owner');
    content : String    = 'Hello';

    constructor(id=this.id, owner=this.owner, content=this.content, ...other){
        super(id);
        this.owner   = owner;
        this.content  = content;
    }
    callMe(param){
        super.callMe(param+' Hello');
    }
}

export default new Post();
