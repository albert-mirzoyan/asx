class Utils {
    static MAX_LENGTH   = 256;
    static MAX_INT      = Number.MAX_INT || 9007199254740991;
    static NUMERIC      = /^[0-9]+$/;
    static LOOSE        = /^[v=\s]*([0-9]+)\.([0-9]+)\.([0-9]+)(?:-?((?:[0-9]+|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:[0-9]+|\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    static FULL         = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
    static compareNum(a, b){
        var an = this.NUMERIC.test(a);
        var bn = this.NUMERIC.test(b);
        if (an && bn) {
            a = +a;
            b = +b;
        }
        return (an && !bn) ? -1 :
            (bn && !an) ? 1 :
                a < b ? -1 :
                    a > b ? 1 : 0;
    }
}
class Version {
    static version = '2.0.0';
    constructor(version, loose=false) {
        if (version instanceof Version) {
            if (version.loose === loose)
                return version;
            else
                version = version.version;
        } else
        if (typeof version !== 'string') {
            throw new TypeError('Invalid Version: ' + version);
        }

        if (version.length > Utils.MAX_LENGTH){
            throw new TypeError('version is longer than ' + Utils.MAX_LENGTH + ' characters')
        }
        if (!(this instanceof Version)){
            return new SemVer(version, loose);
        }
        this.loose = loose;
        var m = version.trim().match(loose ? Utils.LOOSE : Utils.FULL);
        if (!m) {
            throw new TypeError('Invalid Version: ' + version);
        }

        this.raw = version;

        // these are actually numbers
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];

        if (this.major > Utils.MAX_INT || this.major < 0)
            throw new TypeError('Invalid major version')

        if (this.minor > Utils.MAX_INT || this.minor < 0)
            throw new TypeError('Invalid minor version')

        if (this.patch > Utils.MAX_INT || this.patch < 0)
            throw new TypeError('Invalid patch version')

        // numberify any prerelease numeric ids
        if (!m[4])
            this.prerelease = [];
        else
            this.prerelease = m[4].split('.').map(function(id) {
                if (/^[0-9]+$/.test(id)) {
                    var num = +id;
                    if (num >= 0 && num < Utils.MAX_INT)
                        return num
                }
                return id;
            });

        this.build = m[5] ? m[5].split('.') : [];
        this.format();
    }
    format() {
        this.version = this.major + '.' + this.minor + '.' + this.patch;
        if (this.prerelease.length)
            this.version += '-' + this.prerelease.join('.');
        return this.version;
    }
    inspect() {
        return '<SemVer "' + this + '">';
    }
    toString() {
        return this.version;
    }
    compare(other) {
        if (!(other instanceof Version)) {
            other = new Version(other, this.loose);
        }
        return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
        if (!(other instanceof Version)) {
            other = new Version(other, this.loose);
        }
        return Utils.compareNum(this.major, other.major) ||
            Utils.compareNum(this.minor, other.minor) ||
            Utils.compareNum(this.patch, other.patch);
    }
    comparePre(other) {
        if (!(other instanceof Version)) {
            other = new Version(other, this.loose);
        }
        if (this.prerelease.length && !other.prerelease.length) {
            return -1;
        } else
        if (!this.prerelease.length && other.prerelease.length) {
            return 1;
        } else
        if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
        }
        var i = 0;
        do {
            var a = this.prerelease[i];
            var b = other.prerelease[i];
            if (a === undefined && b === undefined) {
                return 0;
            } else
            if (b === undefined) {
                return 1;
            } else
            if (a === undefined) {
                return -1;
            } else
            if (a !== b) {
                return Utils.compareNum(a, b);
            }
        } while (++i);
    }
    inc(release, identifier) {
        switch (release) {
            case 'premajor':
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc('pre', identifier);
                break;
            case 'preminor':
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc('pre', identifier);
                break;
            case 'prepatch':
                // If this is already a prerelease, it will bump to the next version
                // drop any prereleases that might already exist, since they are not
                // relevant at this point.
                this.prerelease.length = 0;
                this.inc('patch', identifier);
                this.inc('pre', identifier);
                break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case 'prerelease':
                if (this.prerelease.length === 0)
                    this.inc('patch', identifier);
                this.inc('pre', identifier);
                break;
            case 'major':
                // If this is a pre-major version, bump up to the same major version.
                // Otherwise increment major.
                // 1.0.0-5 bumps to 1.0.0
                // 1.1.0 bumps to 2.0.0
                if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0)
                    this.major++;
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            case 'minor':
                // If this is a pre-minor version, bump up to the same minor version.
                // Otherwise increment minor.
                // 1.2.0-5 bumps to 1.2.0
                // 1.2.1 bumps to 1.3.0
                if (this.patch !== 0 || this.prerelease.length === 0)
                    this.minor++;
                this.patch = 0;
                this.prerelease = [];
                break;
            case 'patch':
                // If this is not a pre-release version, it will increment the patch.
                // If it is a pre-release it will bump up to the same patch version.
                // 1.2.0-5 patches to 1.2.0
                // 1.2.0 patches to 1.2.1
                if (this.prerelease.length === 0)
                    this.patch++;
                this.prerelease = [];
                break;
            // This probably shouldn't be used publicly.
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case 'pre':
                if (this.prerelease.length === 0)
                    this.prerelease = [0];
                else {
                    var i = this.prerelease.length;
                    while (--i >= 0) {
                        if (typeof this.prerelease[i] === 'number') {
                            this.prerelease[i]++;
                            i = -2;
                        }
                    }
                    if (i === -1) // didn't increment anything
                        this.prerelease.push(0);
                }
                if (identifier) {
                    // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                    // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                    if (this.prerelease[0] === identifier) {
                        if (isNaN(this.prerelease[1]))
                            this.prerelease = [identifier, 0];
                    } else
                        this.prerelease = [identifier, 0];
                }
                break;

            default:
                throw new Error('invalid increment argument: ' + release);
        }
        this.format();
        return this;
    }
}

export default Version;