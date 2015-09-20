/**
 * Created by Sergey on 9/20/15.
 */
export class Model {
    id:String;
    constructor(id:String){
        this.id = id || Math.random().toString(32);
    }
}