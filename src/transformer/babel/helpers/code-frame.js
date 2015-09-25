import {StringUtil} from "../utils/string";
import {EsUtils} from "../utils/esutils";
const NEWLINE = /\r\n|[\n\r\u2028\u2029]/;


function get(options, key, defaultValue) {
    return (key in options ? options[key] : defaultValue)
}
function lineNumbers(code, options) {
    var getOption = get.bind(null, options || {});
    var transform = getOption("transform", Function.prototype);
    var padding   = getOption("padding", " ");
    var before    = getOption("before", " ");
    var after     = getOption("after", " | ");
    var start     = getOption("start", 1);
    var isArray   = Array.isArray(code);
    var lines     = (isArray ? code : code.split("\n"));
    var end       = start + lines.length - 1;
    var width     = String(end).length;
    var numbered  = lines.map(function(line, index) {
        var number  = start + index;
        var params  = {before: before, number: number, width: width, after: after,
            line: line};
        transform(params);
        return params.before + StringUtil.leftPad(params.number, width, padding) +
            params.after + params.line
    });
    return (isArray ? numbered : numbered.join("\n"))
}

function matchToToken(match) {
    var token = {
        type: "invalid",
        value: match[0]
    };
    if (match[1]) {
        token.type = "string";
        token.closed = !!(match[3] || match[4])
    } else if (match[5]) {
        token.type = "comment";
    } else if (match[6]) {
        token.type = "comment";
        token.closed = !!match[7]
    } else if (match[8]) {
        token.type = "regex";
    } else if (match[9]) {
        token.type = "number";
    } else if (match[10]) {
        token.type = "name";
    } else if (match[11]) {
        token.type = "punctuator";
    } else if (match[12]) {
        token.type = "whitespace";
    }
    return token
}
function getTokenType(match) {
    var token = matchToToken(match);
    if (token.type === "name" && EsUtils.isReservedWordES6(token.value)) {
        return "keyword";
    }
    if (token.type === "punctuator") {
        switch (token.value) {
            case "{":
            case "}":
                return "curly";
            case "(":
            case ")":
                return "parens";
            case "[":
            case "]":
                return "square";
        }
    }
    return token.type;
}

export default function (lines:number, lineNumber:number, colNumber:number, opts = {}):string {
    colNumber = Math.max(colNumber, 0);

    lines = lines.split(NEWLINE);
    var start = Math.max(lineNumber - 3, 0);
    var end = Math.min(lines.length, lineNumber + 3);
    if (!lineNumber && !colNumber) {
        start = 0;
        end = lines.length;
    }
    return lineNumbers(lines.slice(start, end), {
        start: start + 1,
        before: "  ",
        after: " | ",
        transform(params) {
            if (params.number !== lineNumber) {
                return;
            }
            if (colNumber) {
                params.line += `\n${params.before}${StringUtil.repeat(" ", params.width)}${params.after}${StringUtil.repeat(" ", colNumber - 1)}^`;
            }
            params.before = params.before.replace(/^./, ">");
        }
    }).join("\n");
};
