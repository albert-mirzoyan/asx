export class StringUtil {
    static repeat(str, n){
        if (typeof str !== 'string') {
            throw new TypeError('Expected a string as the first argument');
        }
        if (n < 0 || !Number.isFinite(n)) {
            throw new TypeError('Expected a finite positive number');
        }
        var ret = '';
        do {
            if (n & 1) {
                ret += str;
            }
            str += str;
        } while (n = n >> 1);
        return ret;
    }
    static leftPad (str, len, ch) {
        str = String(str);

        var i = -1;

        ch || (ch = ' ');
        len = len - str.length;


        while (++i < len) {
            str = ch + str;
        }

        return str;
    }
    static trimRight(str) {
        var tail = str.length;
        while (/[\s\uFEFF\u00A0]/.test(str[tail - 1])) {
            tail--;
        }
        return str.slice(0, tail);
    }
}