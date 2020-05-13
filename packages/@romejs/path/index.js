"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const os = require("os");
function toFilePath(pathOrString) {
    if (typeof pathOrString === 'string') {
        return createUnknownFilePath(pathOrString);
    }
    else {
        return pathOrString;
    }
}
__export(require("./collections"));
class BaseFilePath {
    constructor(parsed, opts) {
        if (parsed.segments.length === 0) {
            throw new Error('Cannot construct a FilePath with zero segments');
        }
        this.segments = parsed.segments;
        this.absoluteTarget = parsed.absoluteTarget;
        this.absoluteType = parsed.absoluteType;
        // Memoized
        this.memoizedUnique = undefined;
        this.memoizedParent = opts.parent;
        this.memoizedFilename = opts.filename;
        this.memoizedExtension = opts.ext;
        this.memoizedChildren = new Map();
    }
    getParsed() {
        return {
            segments: this.segments,
            absoluteTarget: this.absoluteTarget,
            absoluteType: this.absoluteType,
        };
    }
    // These methods ensure the correct return classes
    _assert() {
        throw new Error('Unimplemented');
    }
    _fork(parsed, opts) {
        throw new Error('Unimplemented');
    }
    addExtension(ext, clearExt = false) {
        const newBasename = clearExt
            ? this.getExtensionlessBasename()
            : this.getBasename();
        const newExt = clearExt ? ext : this.memoizedExtension + ext;
        const segments = this.getParentSegments(false).concat(newBasename + ext);
        return this._fork({
            ...this.getParsed(),
            segments,
        }, {
            ext: newExt,
            parent: this.memoizedParent,
        });
    }
    changeBasename(newBasename) {
        const segments = this.getParentSegments(false).concat(newBasename);
        return this._fork({
            ...this.getParsed(),
            segments,
        }, {
            parent: this.memoizedParent,
        });
    }
    getBasename() {
        const { segments } = this;
        const offset = this.isExplicitFolder() ? 2 : 1;
        return segments[segments.length - offset] || '';
    }
    getExtensionlessBasename() {
        const basename = this.getBasename();
        const ext = this.getExtensions();
        if (ext === '') {
            return basename;
        }
        else {
            return basename.slice(0, -ext.length);
        }
    }
    getParent() {
        if (this.memoizedParent !== undefined) {
            return this.memoizedParent;
        }
        const parent = this._fork({
            ...this.getParsed(),
            segments: this.getParentSegments(),
        }, {});
        this.memoizedParent = parent;
        return parent;
    }
    getParentSegments(explicit = true) {
        // Should we throw an error?
        if (this.isRoot()) {
            return this.segments;
        }
        const segments = this.getSegments().slice(0, -1);
        // Always make this an explicit folder
        if (explicit && segments.length > 0 && segments[0] !== '') {
            segments.push('');
        }
        return segments;
    }
    toExplicitRelative() {
        const relative = this.assertRelative();
        if (relative.isExplicitRelative()) {
            return relative;
        }
        else {
            return createRelativeFilePath('.').append(relative);
        }
    }
    assertRelative() {
        if (this.isAbsolute()) {
            throw new Error(`Expected relative file path but got: ${this.join()}`);
        }
        else {
            return new RelativeFilePath(this.getParsed(), {
                ext: this.memoizedExtension,
                filename: this.memoizedFilename,
            });
        }
    }
    assertAbsolute() {
        if (this.isAbsolute()) {
            return new AbsoluteFilePath(this.getParsed(), {
                ext: this.memoizedExtension,
                filename: this.memoizedFilename,
            });
        }
        else {
            throw new Error(`Expected absolute file path but got: ${this.join()}`);
        }
    }
    assertURL() {
        if (this.isURL()) {
            return new URLFilePath(this.getParsed(), {
                ext: this.memoizedExtension,
                filename: this.memoizedFilename,
            });
        }
        else {
            throw new Error(`Expected URL file path but got: ${this.join()}`);
        }
    }
    isRoot() {
        if (this.segments.length === 1) {
            return true;
        }
        if (this.segments.length === 2) {
            // Explicit folder reference
            return this.segments[1] === '';
        }
        if (this.segments.length === 3) {
            return this.absoluteType === 'windows-unc';
        }
        return false;
    }
    isWindows() {
        return (this.absoluteType === 'windows-drive' ||
            this.absoluteType === 'windows-unc');
    }
    isPosix() {
        return !this.isWindows();
    }
    isURL() {
        return this.absoluteType === 'url';
    }
    isAbsolute() {
        return this.absoluteTarget !== undefined && this.absoluteType !== 'url';
    }
    isRelative() {
        return !this.isAbsolute();
    }
    isRelativeTo(otherRaw) {
        const other = toFilePath(otherRaw);
        const otherSegments = other.getSegments();
        const ourSegments = this.getSegments();
        // We can't be relative to a path with more segments than us
        if (otherSegments.length > ourSegments.length) {
            return false;
        }
        // Check that we start with the same segments as the other
        for (let i = 0; i < otherSegments.length; i++) {
            if (otherSegments[i] !== ourSegments[i]) {
                return false;
            }
        }
        return true;
    }
    isImplicitRelative() {
        return !this.isExplicitRelative() && !this.isAbsolute() && !this.isURL();
    }
    isExplicitRelative() {
        const [firstSeg] = this.segments;
        return !this.isURL() && (firstSeg === '.' || firstSeg === '..');
    }
    isExplicitFolder() {
        const { segments } = this;
        return segments[segments.length - 1] === '';
    }
    hasEndExtension(ext) {
        return this.getExtensions().endsWith(`.${ext}`);
    }
    hasExtension(ext) {
        return (this.hasEndExtension(ext) || this.getExtensions().includes(`.${ext}.`));
    }
    getExtensions() {
        if (this.memoizedExtension === undefined) {
            const ext = getExtension(this.getBasename());
            this.memoizedExtension = ext;
            return ext;
        }
        else {
            return this.memoizedExtension;
        }
    }
    hasExtensions() {
        return this.getExtensions() !== '';
    }
    getSegments() {
        let { segments } = this;
        if (!this.isRoot()) {
            if (this.isExplicitFolder()) {
                segments = segments.slice(0, -1);
            }
            if (segments[0] === '.') {
                segments = segments.slice(1);
            }
        }
        return segments;
    }
    getRawSegments() {
        return this.segments;
    }
    getUnique() {
        if (this.memoizedUnique !== undefined) {
            return this.memoizedUnique;
        }
        let segments;
        if (!this.isRoot()) {
            if (this.isExplicitFolder()) {
                segments = this.getSegments();
                if (this.isExplicitRelative()) {
                    segments = segments.slice(1);
                }
            }
            else if (this.isExplicitRelative()) {
                segments = this.getRawSegments().slice(1);
            }
        }
        if (segments === undefined) {
            return this._assert();
        }
        else {
            const path = this._fork(parsePathSegments(segments), {});
            this.memoizedUnique = path;
            return path;
        }
    }
    // Support some bad string coercion. Such as serialization in CLI flags.
    toString() {
        return this.join();
    }
    join() {
        if (this.memoizedFilename !== undefined) {
            return this.memoizedFilename;
        }
        const { segments } = this;
        let filename;
        if (this.isWindows()) {
            filename = segments.join('\\');
        }
        else {
            filename = segments.join('/');
        }
        this.memoizedFilename = filename;
        return filename;
    }
    // This does some weird optimizations to avoid materializing complete filenames
    // Might not be relevant... TODO benchmark this or something lol
    equal(other) {
        // Quick check if we've materalized the filename on both instances
        if (this.memoizedFilename !== undefined &&
            other.memoizedFilename !== undefined) {
            return this.memoizedFilename === other.memoizedFilename;
        }
        const a = this.getSegments();
        const b = other.getSegments();
        // Quick check
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }
    format(cwd) {
        const filename = this.join();
        const names = [];
        names.push(filename);
        // Get a path relative to HOME
        if (this.isRelativeTo(exports.HOME_PATH)) {
            // Path starts with the home directory, so let's trim it off
            const relativeToHome = exports.HOME_PATH.relative(this._assert());
            // Add tilde and push it as a possible name
            // We construct this manually to get around the segment normalization which would explode ~
            names.push(new RelativeFilePath({
                segments: ['~', ...relativeToHome.getSegments()],
                absoluteType: 'posix',
                absoluteTarget: undefined,
            }, {}).join());
        }
        // Get a path relative to the cwd
        if (cwd !== undefined) {
            names.push(cwd.relative(filename).join());
        }
        // Get the shortest name
        const human = names.sort((a, b) => a.length - b.length)[0];
        if (human === '') {
            return './';
        }
        else {
            return human;
        }
    }
    append(raw) {
        // Check if we have a memoized instance
        if (typeof raw === 'string') {
            const cached = this.memoizedChildren.get(raw);
            if (cached !== undefined) {
                return cached;
            }
        }
        const items = Array.isArray(raw) ? raw : [raw];
        if (items.length === 0) {
            return this._assert();
        }
        let segments = this.getSegments();
        for (const item of items) {
            segments = segments.concat(toFilePath(item).getSegments());
        }
        const parsed = parsePathSegments(segments);
        const child = this._fork(parsed, {});
        // Set memoized child if possible
        if (typeof raw === 'string') {
            this.memoizedChildren.set(raw, child);
        }
        return child;
    }
}
class RelativeFilePath extends BaseFilePath {
    constructor() {
        super(...arguments);
        // TypeScript is structurally typed whereas here we would prefer nominal typing
        // We use this as a hack.
        this.type = 'relative';
    }
    _assert() {
        return this;
    }
    _fork(parsed, opts) {
        return new RelativeFilePath(parsed, opts);
    }
    assertRelative() {
        return this;
    }
}
exports.RelativeFilePath = RelativeFilePath;
class AbsoluteFilePath extends BaseFilePath {
    constructor() {
        super(...arguments);
        this.type = 'absolute';
    }
    _assert() {
        return this;
    }
    _fork(parsed, opts) {
        return new AbsoluteFilePath(parsed, opts);
    }
    assertAbsolute() {
        return this;
    }
    getChain() {
        if (this.chain !== undefined) {
            return this.chain;
        }
        const paths = [];
        this.chain = paths;
        // We use getParent here so we can reuse as much memoized information as possible
        let target = this;
        while (true) {
            paths.push(target);
            if (target.isRoot()) {
                break;
            }
            else {
                target = target.getParent();
            }
        }
        return paths;
    }
    resolveMaybeUrl(otherRaw) {
        const other = toFilePath(otherRaw);
        if (other.isURL()) {
            return other.assertURL();
        }
        else {
            return this.resolve(other);
        }
    }
    resolve(otherRaw) {
        const other = toFilePath(otherRaw);
        if (other.isAbsolute()) {
            return other.assertAbsolute();
        }
        return new AbsoluteFilePath(parsePathSegments([...this.getSegments(), ...other.getSegments()]), {});
    }
    relative(otherRaw) {
        const other = this.resolve(toFilePath(otherRaw));
        if (other.equal(this)) {
            return createRelativeFilePath('.');
        }
        const absolute = this.getSegments().slice();
        const relative = other.getSegments().slice();
        // Impossible to relativize two absolute paths with different roots
        if (absolute[0] !== relative[0]) {
            return other;
        }
        // Remove common starting segments
        while (absolute[0] === relative[0]) {
            absolute.shift();
            relative.shift();
        }
        let finalSegments = [];
        for (let i = 0; i < absolute.length; i++) {
            finalSegments.push('..');
        }
        finalSegments = finalSegments.concat(relative);
        return createUnknownFilePathFromSegments(parsePathSegments(finalSegments));
    }
}
exports.AbsoluteFilePath = AbsoluteFilePath;
class URLFilePath extends BaseFilePath {
    constructor() {
        super(...arguments);
        this.type = 'url';
    }
    _assert() {
        return this;
    }
    _fork(parsed, opts) {
        return new URLFilePath(parsed, opts);
    }
    assertURL() {
        return this;
    }
    isURL() {
        return true;
    }
    getDomain() {
        return this.segments[2];
    }
    getProtocol() {
        const { absoluteTarget } = this;
        if (absoluteTarget === undefined) {
            throw new Error('Expected a URLFilePath to always have an absoluteTarget');
        }
        return absoluteTarget;
    }
    resolve(path) {
        if (path.isURL()) {
            return path.assertURL();
        }
        else if (path.isAbsolute()) {
            // Get the segments that include the protocol and domain
            const domainSegments = this.getSegments().slice(0, 3);
            const finalSegments = [...domainSegments, ...path.getSegments()];
            return new URLFilePath(parsePathSegments(finalSegments), {});
        }
        else {
            return this.append(path);
        }
    }
}
exports.URLFilePath = URLFilePath;
exports.HOME_PATH = createAbsoluteFilePath(os.userInfo().homedir);
exports.TEMP_PATH = createAbsoluteFilePath(os.tmpdir());
exports.CWD_PATH = createAbsoluteFilePath(process.cwd());
function getExtension(basename) {
    const match = basename.match(/\.(.*?)$/);
    if (match == null) {
        return '';
    }
    else {
        return match[0];
    }
}
function isWindowsDrive(first) {
    return first.length === 2 && first[1] === ':' && /[A-Z]/i.test(first[0]);
}
function parsePathSegments(segments) {
    if (segments.length === 0) {
        throw new Error('Cannot construct a FilePath with zero segments');
    }
    let absoluteType = 'posix';
    let absoluteTarget;
    let firstSeg = segments[0];
    // Detect URL
    if (!isWindowsDrive(firstSeg) &&
        firstSeg[firstSeg.length - 1] === ':' &&
        segments[1] === '') {
        absoluteTarget = firstSeg.slice(0, -1);
        switch (absoluteTarget) {
            case 'file':
                // Automatically normalize a file scheme into an absolute path
                return parsePathSegments(segments.slice(2).map((segment) => decodeURIComponent(segment)));
            default: {
                const absoluteSegments = segments.slice(0, 3);
                return {
                    segments: normalizeSegments(segments, absoluteSegments.length, absoluteSegments),
                    absoluteType: 'url',
                    absoluteTarget,
                };
            }
        }
    }
    // Explode home directory
    if (firstSeg === '~') {
        segments = [...exports.HOME_PATH.getSegments()];
        firstSeg = segments[0];
    }
    let segmentOffset = 0;
    // We first extract the "absolute" portion of a path, this includes any Windows drive letters, UNC hostnames etc
    const absoluteSegments = [];
    if (firstSeg === '') {
        // POSIX path
        absoluteSegments.push('');
        absoluteTarget = 'posix';
        segmentOffset++;
        // Windows UNC
        if (segments[1] === '' && segments.length >= 3 && segments[2] !== '') {
            const name = segments[2];
            segmentOffset += 2;
            absoluteSegments.push('');
            absoluteSegments.push(name);
            absoluteType = 'windows-unc';
            absoluteTarget = `unc:${name}`;
        }
    }
    else if (isWindowsDrive(firstSeg)) {
        const drive = firstSeg.toUpperCase();
        absoluteSegments.push(drive);
        absoluteType = 'windows-drive';
        absoluteTarget = `drive:${drive}`;
        segmentOffset++;
    }
    const pathSegments = normalizeSegments(segments, segmentOffset, absoluteSegments);
    return {
        segments: pathSegments,
        absoluteType,
        absoluteTarget,
    };
}
function normalizeSegments(segments, offset, absoluteSegments) {
    const relativeSegments = [];
    for (let i = offset; i < segments.length; i++) {
        let seg = segments[i];
        // Only allow a dot part in the first position, otherwise it's a noop
        if (seg === '.' &&
            (segments[1] === '..' || i > 0 || absoluteSegments.length > 0)) {
            continue;
        }
        // Ignore empty segments
        if (seg === '') {
            continue;
        }
        // Remove the previous segment, as long as it's not also ..
        if (seg === '..' &&
            relativeSegments.length > 0 &&
            relativeSegments[relativeSegments.length - 1] !== '..') {
            relativeSegments.pop();
            continue;
        }
        relativeSegments.push(seg);
    }
    const finalSegments = [...absoluteSegments, ...relativeSegments];
    // Retain explicit folder
    if (segments[segments.length - 1] === '' &&
        finalSegments[finalSegments.length - 1] !== '' &&
        relativeSegments.length !== 0) {
        finalSegments.push('');
    }
    return finalSegments;
}
function createUnknownFilePathFromSegments(parsed) {
    const path = new BaseFilePath(parsed, {});
    if (path.isAbsolute()) {
        return path.assertAbsolute();
    }
    else {
        return path.assertRelative();
    }
}
function createFilePathFromSegments(segments) {
    const parsed = parsePathSegments(segments);
    return createUnknownFilePathFromSegments(parsed);
}
exports.createFilePathFromSegments = createFilePathFromSegments;
function toJoinedFilePath(filename) {
    if (typeof filename === 'string') {
        return filename;
    }
    else {
        return createUnknownFilePath(filename).join();
    }
}
exports.toJoinedFilePath = toJoinedFilePath;
function createRelativeFilePath(filename) {
    return createUnknownFilePath(filename).assertRelative();
}
exports.createRelativeFilePath = createRelativeFilePath;
function createURLFilePath(filename) {
    return createUnknownFilePath(filename).assertURL();
}
exports.createURLFilePath = createURLFilePath;
function createAbsoluteFilePath(filename) {
    return createUnknownFilePath(filename).assertAbsolute();
}
exports.createAbsoluteFilePath = createAbsoluteFilePath;
function createUnknownFilePath(filename) {
    // Allows using the create methods above to be used in places where strings are more ergonomic (eg. in third-party code)
    if (filename instanceof BaseFilePath) {
        return filename;
    }
    // Might be better to do a manual loop to detect escaped slashes or some other weirdness
    const segments = filename.split(/[\\\/]/g);
    const parsed = parsePathSegments(segments);
    return createUnknownFilePathFromSegments(parsed);
}
exports.createUnknownFilePath = createUnknownFilePath;
// These are some utility methods so you can pass in `undefined | string`
function maybeCreateURLFilePath(filename) {
    if (filename !== undefined) {
        return createURLFilePath(filename);
    }
    else {
        return undefined;
    }
}
exports.maybeCreateURLFilePath = maybeCreateURLFilePath;
function maybeCreateRelativeFilePath(filename) {
    if (filename !== undefined) {
        return createRelativeFilePath(filename);
    }
    else {
        return undefined;
    }
}
exports.maybeCreateRelativeFilePath = maybeCreateRelativeFilePath;
function maybeCreateAbsoluteFilePath(filename) {
    if (filename !== undefined) {
        return createAbsoluteFilePath(filename);
    }
    else {
        return undefined;
    }
}
exports.maybeCreateAbsoluteFilePath = maybeCreateAbsoluteFilePath;
function maybeCreateUnknownFilePath(filename) {
    if (filename !== undefined) {
        return createUnknownFilePath(filename);
    }
    else {
        return undefined;
    }
}
exports.maybeCreateUnknownFilePath = maybeCreateUnknownFilePath;
