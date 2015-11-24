/**
 * Created by Sergey on 10/26/15.
 */
import {Model} from './model'
import {Post} from './post';


export class User extends Model {

    posts:Array<Post>;

    constructor(){
        super()
    }
}