import FILES from 'fs';
import PATH from 'path';
import ASX from 'runtime';
import {Loader} from 'runtime';

import {Server} from '../server';
import {Mime} from '../mime';
import {Handler} from './handler';

@Server.handler('files')
class FileHandler extends Handler {
    constructor(){
        super();
        this.config = FileHandler.config;
        this.config.path = PATH.resolve(this.config.path);
    }
    resource(path){
        try {
            var stat = FILES.statSync(path);
            if (stat.isDirectory()) {
                return this.resource(PATH.resolve(path, 'index.html'));
            } else
            if (stat.isFile()) {
                return {exist:true,path:path};
            } else {
                return {exist:false,path:path};
            }
        }catch(e){
            return {exist:false,path:path};
        }
    }
    accept(req,res){

    }
    handle(req,res){
        return this.tryDefaultProject(req,res).then(f=>this.streamFile(res,f.path),e=>{
            return this.tryRepositoryProject(req,res).then(f=>this.streamFile(res,f.path),e=>{
                return this.tryStaticFile(req,res).then(f=>this.streamFile(res,f.path),f=>{
                    return this.errorNotFound(res,f.path);
                })
            })
        });
    }
    getDefaultProject(){
        if(this.main){
            return Promise.resolve(this.main);
        } else
        if(this.config.main){
            return ASX.loader.loadProjectInstance(this.config.main).then(p=>{
                return this.main = PATH.dirname(p.url);
            });
        }else{
            return Promise.reject(new Error('Default Project Disabled'));
        }
    }
    tryDefaultProject(req,res){
        return this.getDefaultProject().then(base=>{
            var file = this.resource(base+req.url);
            if(file.exist){
                return Promise.resolve(file);
            }else{
                return Promise.reject(file);
            }
        })
    }
    tryRepositoryProject(req,res){
        if(this.config.repo && req.url.indexOf(this.config.repo)==0){
            var path = req.url.substring(this.config.repo.length);
            console.info(path)
            if(path=='/runtime.js'){
                var file = this.resource(ASX.loader.repository+path);
                if(file.exist){
                    return Promise.resolve(file);
                }else{
                    return Promise.reject(file);
                }
            }else{
                return ASX.loader.loadProjectInstance(path.substring(1)).then(p=>{
                    if(p.platforms.indexOf('browser')>=0){
                        var file = this.resource(ASX.loader.repository+path);
                        if(file.exist){
                            return Promise.resolve(file);
                        }else{
                            return Promise.reject(file);
                        }
                    }else{
                        return Promise.reject(new Error('Repository Project Not Supported For Browser'));
                    }
                })
            }

        }else{
            return Promise.reject(new Error('Repository Project Disabled'));
        }
    }
    tryStaticFile(req,res){
        var file = this.resource(this.config.path+req.url);
        if(file.exist){
            return Promise.resolve(file);
        }else{
            return Promise.reject(file);
        }
    }
    streamFile(res,path){
        res.writeHead(200,{
            'Content-Type': Mime.getType(path)
        });
        res.stream = FILES.createReadStream(path);
        return res.stream;
    }
    errorNotFound(res,path){
        res.writeHead(404,{
            'Content-Type': Mime.getType(path)
        });
        res.end('File Not Found : '+path);
    }
}