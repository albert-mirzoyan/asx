/**
 * Created by Sergey on 5/12/15.
 */

JSON.ast_print = function print(ast){
  console.info(JSON.ast(ast,'  '));
}
JSON.ast = function stringifyAst(ast,ident,ranges){
  return JSON.stringify(ast,function censor(key, value) {
    if(key.charAt(0)=="_" || key=="tokens"){
      return undefined;
    }else
    if(
      key=="start" ||
      key=="loc"   ||
      key=="range" ||
      key=="end"
    ){
      return ranges ? value:undefined;
    }
    return value;
  },ident);
}
export default JSON.ast;
