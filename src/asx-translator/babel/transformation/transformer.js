import {isFunction} from "../../lodash/index";
import {isObject} from "../../lodash/index";
import {each} from "../../lodash/index";
import {assign} from "../../lodash/index";

import TransformerPass from "./transformer-pass";
import * as messages from "../messages";


import traverse from "../traversal/index";
import * as acorn from "../../acorn/index";
import File from "./file/index";


/**
 * This is the class responsible for normalising a transformers handlers
 * as well as constructing a `TransformerPass` that is responsible for
 * actually running the transformer over the provided `File`.
 */

export default class Transformer {
  constructor(transformerKey: string, transformer: Object) {
    transformer = assign({}, transformer);

    var take = function (key) {
      var val = transformer[key];
      delete transformer[key];
      return val;
    };

    this.manipulateOptions = take("manipulateOptions");
    this.shouldVisit       = take("shouldVisit");
    this.metadata          = take("metadata") || {};
    this.parser            = take("parser");
    this.post              = take("post");
    this.pre               = take("pre");

    //

    if (this.metadata.stage != null) {
      this.metadata.optional = true;
    }

    //

    this.handlers = this.normalize(transformer);
    this.key      = transformerKey;

    //

    if (!this.shouldVisit && !this.handlers.enter && !this.handlers.exit) {
      var types = Object.keys(this.handlers);
      this.shouldVisit = function (node) {
        for (var i = 0; i < types.length; i++) {
          if (node.type === types[i]) return true;
        }
        return false;
      };
    }
  }

  normalize(transformer: Object): Object {
    if (isFunction(transformer)) {
      transformer = { ast: transformer };
    }

    traverse.explode(transformer);

    each(transformer, (fns, type) => {
      // hidden property
      if (type[0] === "_") {
        this[type] = fns;
        return;
      }

      if (type === "enter" || type === "exit") return;

      if (isFunction(fns)) fns = { enter: fns };

      if (!isObject(fns)) return;

      if (!fns.enter) fns.enter = function () { };
      if (!fns.exit) fns.exit = function () { };

      transformer[type] = fns;
    });

    return transformer;
  }

  buildPass(file: File): TransformerPass {
    // validate Transformer instance
    if (!(file instanceof File)) {
      throw new TypeError(messages.get("transformerNotFile", this.key));
    }

    return new TransformerPass(file, this);
  }
}
