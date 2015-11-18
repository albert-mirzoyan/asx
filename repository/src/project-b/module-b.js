export {C} from './module-c';
export {D} from './module-d';
import {A} from './module-a';

export const B = A+' A > MODULE B';
export const S = new Shared("S");


class Base {
    constructor(name){
        this.name = name;
    }
    sayHello(){
        return 'Hello';
    }
}

class Shared extends Base{
    constructor(name){
        super(name);
    }
    toString(){
        return `Shared(${this.name},${super.sayHello()})`;
    }
}