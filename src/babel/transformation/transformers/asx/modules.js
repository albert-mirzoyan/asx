export var metadata = {
    group: "builtin-pre"
};
export var visitor = {
    FunctionDeclaration(node, parent, scope, file) {
        console.info('FunctionDeclaration',scope.toString());
        return node;
    },
    MethodDefinition(node, parent, scope, file){
        console.info('MethodDefinition',scope.toString());
        return node;
    }
};
