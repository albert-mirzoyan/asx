export function Program(program, parent, scope, file) {
  this.stop();
  if (file.moduleFormatter.transform) {
    file.moduleFormatter.transform(program);
  }
}
