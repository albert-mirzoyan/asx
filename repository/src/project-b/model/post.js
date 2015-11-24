/**
 * Created by Sergey on 10/26/15.
 */
import {Model} from './model'
import {User} from './user'



export class Post extends Model {
    owner:User;
    constructor(){
        super()
    }
}