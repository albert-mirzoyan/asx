import {Server} from 'asx-server/http/server';
import {rest} from 'asx-server/http/rest';

import 'asx-server/http/handlers/files';
import 'asx-server/http/handlers/rest';

@rest('/resource')
class Resource {
    get(){
        return {hello:'World'}
    }
}

export default new Server({
    port  : 5656,
    host  : '0.0.0.0',
    rest  : {
        path:'/api'
    },
    files : {
        repo  : '/repo',
        main  : 'asx-test',
        path  : '.'
    }
}).start();
