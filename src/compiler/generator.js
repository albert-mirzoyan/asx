import gen from "./generation/index";

export default class Generator {
    static generate(ast, opts = {},code=null) {
        return gen(ast,opts,code);
    }
}