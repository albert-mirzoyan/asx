import HTTP from 'http';
import URL from 'url';

export class Server {
    static initResponse(res) {}
    static initRequest(req) {
        req.headers['x-client-ip'] = (()=>{
            // the ipAddress we return
            var ipAddress;
            // workaround to get real client IP
            // most likely because our app will be behind a [reverse] proxy or load balancer
            var clientIp = req.headers['x-client-ip'],
                forwardedForAlt = req.headers['x-forwarded-for'],
                realIp = req.headers['x-real-ip'],
            // more obsure ones below
                clusterClientIp = req.headers['x-cluster-client-ip'],
                forwardedAlt = req.headers['x-forwarded'],
                forwardedFor = req.headers['forwarded-for'],
                forwarded = req.headers['forwarded'];
            // x-client-ip
            if (clientIp) {
                ipAddress = clientIp;
            }

            // x-forwarded-for
            else if (forwardedForAlt) {
                // x-forwarded-for header is more common
                // it may return multiple IP addresses in the format:
                // "client IP, proxy 1 IP, proxy 2 IP"
                // we pick the first one
                var forwardedIps = forwardedForAlt.split(',');
                ipAddress = forwardedIps[0];
            }

            // x-real-ip
            // (default nginx proxy/fcgi)
            else if (realIp) {
                // alternative to x-forwarded-for
                // used by some proxies
                ipAddress = realIp;
            }

            // x-cluster-client-ip
            // (Rackspace LB and Riverbed's Stingray)
            // http://www.rackspace.com/knowledge_center/article/controlling-access-to-linux-cloud-sites-based-on-the-client-ip-address
            // https://splash.riverbed.com/docs/DOC-1926
            else if (clusterClientIp) {
                ipAddress = clusterClientIp;
            }

            // x-forwarded
            else if (forwardedAlt) {
                ipAddress = forwardedAlt;
            }

            // forwarded-for
            else if (forwardedFor) {
                ipAddress = forwardedFor;
            }

            // forwarded
            else if (forwarded) {
                ipAddress = forwarded;
            }

            // fallback to something
            if (!ipAddress) {
                // ensure getting client IP address still works in development environment
                // if despite all this we do not find ip, then it returns null
                try {
                    ipAddress = req.connection.remoteAddress ||
                        req.socket.remoteAddress ||
                        req.connection.socket.remoteAddress || // for https
                        null;
                } catch(e) {
                    ipAddress = null;
                }
            }

            // final attempt to get IP address, via info object within request.
            // if despite all this we do not find ip, then it returns null.
            if (!ipAddress) {
                if (typeof req.info !== 'undefined'){
                    ipAddress = req.info.remoteAddress || null;
                }
            }

            return ipAddress;
        })()
    }
    static handlers = Object.create(null);
    static handler(name){
        return handler=>{
            Object.defineProperty(Server.handlers,name,{
                enumerable      : true,
                configurable    : true,
                value           : handler
            })
        }
    }
    constructor(config){
        this.config = config;
        this.handlers = Object.create(null);
        this.doUpgrade = this.doUpgrade.bind(this);
        this.doRequest = this.doRequest.bind(this);
    }
    start(){
        console.info('Starting Server At ',this.config.host,this.config.port);
        Object.keys(Server.handlers).forEach(name=>{
            this.handlers[name] = new (Server.handlers[name].configure(this,this.config[name]))();
        });
        this.server = new HTTP.Server();
        this.server.on('upgrade',this.doUpgrade);
        this.server.on('request',this.doRequest);
        this.server.listen(this.config.port,this.config.host);
        return this;
    }
    doUpgrade(){}
    doRequest(req,res){
        console.info(req.method,req.url);
        Server.initRequest(req);
        Server.initResponse(res);
        var chain = new Promise((resolve,reject)=>{
            var body = new Buffer(0);
            req.on('data',(chunk)=>{
                body=Buffer.concat([body,chunk],body.length+chunk.length);
            });
            req.on('end',()=>{
                req.body = body;
                resolve();
            });
        });
        Object.keys(this.handlers).forEach(name=>{
            var handler = this.handlers[name];
            chain = chain.then(()=>{
                if(!res.finished){
                    if(typeof handler.handle=='function'){
                        return handler.handle(req,res);
                    }
                }else{
                    return true;
                }
            });
        });
        chain.then(
            s=>{
                if(res.stream){
                    res.stream.pipe(res);
                }else{
                    res.end()
                }
            },
            e=>{
                console.error(e.stack);
                res.writeHead(500,{
                    'Content-Type': 'text/plain'
                });
                res.end(e.stack);
            }
        ).catch(e=>{

        });
        return chain;
    }
}