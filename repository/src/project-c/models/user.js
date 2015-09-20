import {Model} from '../model';
import {Post} from './post';

export class User extends Model {

    name  : String;
    email : String;
    posts : Array<Post>;

    constructor(name:String,email:String){
        super();
        this.name = name;
        this.email = email;
        this.posts = [];
    }
    addPost(title){
        this.posts.push(new Post(title,this));
    }
    toString(){
        return `User(${this.name},${this.email},${this.posts.length})`;
    }
}