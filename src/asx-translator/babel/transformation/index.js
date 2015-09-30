import Pipeline from "./transformer-pipeline";
import transformers from "./transformers/index";

var pipeline = new Pipeline();
pipeline.addTransformers(transformers);

export default pipeline.transform.bind(pipeline);
