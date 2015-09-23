import {RestHandler} from './handlers/rest';

export function rest(path){
    return resource => {
        RestHandler.register(path,resource);
    }
}

