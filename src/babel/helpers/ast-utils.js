import * as t from '../types/index';

export class AstUtils {
    static MODULE             = t.memberExpression(t.identifier('Asx'),t.identifier('module'));
    static MODULE_METHOD      = t.memberExpression(t.identifier('Asx'),t.identifier('method'));
    static MODULE_FIELD       = t.memberExpression(t.identifier('Asx'),t.identifier('field'));
    static MODULE_DEFAULT     = t.memberExpression(t.identifier('Asx'),t.identifier('default'));

    static CLASS              = t.memberExpression(t.identifier('Asx'),t.identifier('class')); // not yet
    static CLASS_SUPER        = t.memberExpression(t.identifier('Asx'),t.identifier('super'));
    static CLASS_METHOD       = t.memberExpression(t.identifier('Asx'),t.identifier('method'));
    static CLASS_FIELD        = t.memberExpression(t.identifier('Asx'),t.identifier('field'));
    static CLASS_CONSTRUCTOR  = t.memberExpression(t.identifier('Asx'),t.identifier('default'));


    static decoratorId = t.identifier("A");

    static convertDecorators(decorators,id){
        return t.functionExpression(id,[],t.blockStatement([t.returnStatement(
            t.arrayExpression(decorators.map(d=>d.expression))
        )]))
    }
    static convertType(type,expr){
        var parameters = [];
        switch(type.type){
            case 'TypeAnnotation' : return this.convertType(type.typeAnnotation,expr); break;
            case 'VoidTypeAnnotation' : break;
            case 'AnyTypeAnnotation' : parameters.push(t.identifier('Object')); break;
            case 'NumberTypeAnnotation' : parameters.push(t.identifier('Number')); break;
            case 'BooleanTypeAnnotation' : parameters.push(t.identifier('Boolean')); break;
            case 'StringTypeAnnotation' : parameters.push(t.identifier('String')); break;
            default : parameters.push(type.id);
        }
        if(type.typeParameters){
            var tps  = type.typeParameters;
            tps.params.forEach(p=>{
                parameters.push(this.convertType(p,true));
            })
        }
        return t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('type')),parameters);
    }

    static convertArguments(params){
        var p=[];
        params.forEach(i=>p.push(this.convertArgument(i)));
        return t.arrayExpression(p);
    }
    static convertArgument(param) {
        var type,init=param.init,rest=param.isRest,optional=param.isOptional,args=[];
        if (param.typeAnnotation) {
            type = this.convertType(param.typeAnnotation.typeAnnotation)
        } else {
            type = this.convertType(t.genericTypeAnnotation(t.identifier('Object')))
        }
        args.push(t.literal(param.name));
        args.push(optional ? t.literal(1):t.literal(0));
        args.push(rest ? t.literal(1):t.literal(0));
        args.push(type);
        //args.push(init?init:t.literal(null));

        return t.callExpression(t.memberExpression(t.identifier('Asx'),t.identifier('arg')),args)
    }
}
export default AstUtils;