import {Model} from '../model';
import {User} from './user';

export class Post extends Model {
    title  : String;
    owner  : User;
    constructor(title:String,owner:User){
        super();
        this.title = title;
        this.owner = owner;
    }
    toString(){
        return `User(${this.name},${this.email})`;
    }
}