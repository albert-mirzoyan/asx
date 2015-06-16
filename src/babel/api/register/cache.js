import path from "path";
import os from "os";
import fs from "fs";
import userHome from "user-home";

const FILENAME = process.env.BABEL_CACHE_PATH || path.join(userHome || os.tmpdir(), ".babel.json");
var data = {};

export function save() {
  fs.writeFileSync(FILENAME, JSON.stringify(data, null, "  "));
}

export function load() {
  if (process.env.BABEL_DISABLE_CACHE) return;

  process.on("exit", save);
  process.nextTick(save);

  if (!fs.existsSync(FILENAME)) return;

  try {
    data = JSON.parse(fs.readFileSync(FILENAME));
  } catch (err) {
    return;
  }
}

export function get() {
  return data;
}
