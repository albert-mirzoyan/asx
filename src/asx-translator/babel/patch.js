import * as estraverse from "./traversal/traverse";
import {extend} from "../lodash/index";
//import types from "ast-types";
import * as t from "./types/index";

// estraverse

extend(estraverse.VisitorKeys, t.VISITOR_KEYS);
