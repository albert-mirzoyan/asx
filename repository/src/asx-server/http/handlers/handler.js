export class Handler {
    static server:Server;
    static config:Object;
    static configure(server,config){
        this.server = server;
        this.config = config;
        return this;
    }
}