import Transformer from "./transformer";
import File from "./file/index";

export default class TransformerPipeline {
  constructor() {
    this.transformers = Object.create(null);
    this.namespaces   = Object.create(null);
    this.deprecated   = Object.create(null);
    this.aliases      = Object.create(null);
    this.filters      = [];
  }

  addTransformers(transformers) {
    for (var key in transformers) {
      this.addTransformer(key, transformers[key]);
    }
    return this;
  }

  addTransformer(key, transformer) {
    if (this.transformers[key]) {
      throw new Error('Transformer Already Added "'+key+'"');
    }
    var namespace = key.split(".")[0];
    this.namespaces[namespace] = this.namespaces[namespace] || [];
    this.namespaces[namespace].push(key);
    this.namespaces[key] = namespace;
    this.transformers[key] = new Transformer(key, transformer);
  }


  transform(code: string, opts: Object) {
    var file = new File(opts, this);
    return file.wrap(code, function () {
      file.addCode(code, true);
    });
  }
}
