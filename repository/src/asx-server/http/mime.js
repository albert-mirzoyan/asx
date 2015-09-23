import PATH from 'path';
export class Mime {
    static TYPES = {
        '.js'   : 'text/javascript',
        '.css'  : 'text/css',
        '.html' : 'text/html'
    };
    static get EXTENSIONS(){}
    static getType(file){
        var ext = PATH.extname(file) || '.html';
        if(Mime.TYPES[ext]){
            return Mime.TYPES[ext]; 
        }else{
            return ext;
        }
    }
}