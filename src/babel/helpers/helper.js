/**
 * Created by Sergey on 7/6/15.
 */
export default class Helper {
    static decodeModuleName(name){
        return name
            .replace(/ˏ/g,'/')
            .replace(/ꓸ/g,'.')
            .replace(/ˑ/g,'-')
            .replace(/ꓽ/g,':')
            ;
    };
    static encodeModuleName(name){
        return name
            .replace(/\//g,'ˏ')
            .replace(/\./g,'ꓸ')
            .replace(/-/g,'ˑ')
            .replace(/:/g,'ꓽ')
            ;
    };
}