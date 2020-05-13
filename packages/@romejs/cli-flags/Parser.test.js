"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const Parser_1 = require("./Parser");
const cli_reporter_1 = require("@romejs/cli-reporter");
const diagnostics_1 = require("@romejs/diagnostics");
const cli_diagnostics_1 = require("@romejs/cli-diagnostics");
async function testParser(t, { defineFlags, args, callback, }) {
    const reporter = new cli_reporter_1.Reporter();
    const stream = reporter.attachCaptureStream();
    const parser = new Parser_1.default(reporter, {
        programName: 'test',
        defineFlags,
    }, args);
    const { diagnostics } = await diagnostics_1.catchDiagnostics(async () => {
        const flags = await parser.init();
        t.namedSnapshot('flags', flags);
        if (callback !== undefined) {
            callback(parser, flags);
        }
    });
    if (diagnostics !== undefined) {
        cli_diagnostics_1.printDiagnostics({
            diagnostics,
            suppressions: [],
            printerOptions: {
                reporter,
            },
        });
    }
    t.namedSnapshot('output', stream.read());
    const helpStream = reporter.attachCaptureStream();
    await parser.showHelp();
    t.namedSnapshot('help', helpStream.read());
}
rome_1.test('does not allow shorthands', async (t) => {
    await testParser(t, {
        defineFlags: () => { },
        args: ['-f'],
    });
});
rome_1.test('does not allow camel case', async (t) => {
    await testParser(t, {
        defineFlags: () => { },
        args: ['--fooBar'],
    });
});
rome_1.test('flag value equals', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name').asString(),
            };
        },
        args: ['--name=sebastian'],
    });
});
rome_1.test('required flag', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name').asString(),
            };
        },
        args: ['--name', 'sebastian'],
    });
});
rome_1.test('required flag omitted', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name').asString(),
            };
        },
        args: [],
    });
});
rome_1.test('optional flag', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name').asStringOrVoid(),
            };
        },
        args: ['--name', 'sebastian'],
    });
});
rome_1.test('optional flag omitted', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name').asStringOrVoid(),
            };
        },
        args: [],
    });
});
rome_1.test('flag with description', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                name: c.get('name', {
                    description: 'the name of the coolest person in the world',
                }).asStringOrVoid(),
            };
        },
        args: ['--name', 'sebastian'],
    });
});
rome_1.test('optional boolean flag', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                run: c.get('run').asBooleanOrVoid(),
            };
        },
        args: ['--run'],
    });
});
rome_1.test('optional boolean flag omitted', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                run: c.get('run').asBooleanOrVoid(),
            };
        },
        args: ['--run'],
    });
});
rome_1.test('required boolean flag', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                run: c.get('run').asBoolean(),
            };
        },
        args: ['--run'],
    });
});
rome_1.test('required boolean flag omitted', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                run: c.get('run').asBoolean(),
            };
        },
        args: ['--run'],
    });
});
rome_1.test('flip boolean flag', async (t) => {
    await testParser(t, {
        defineFlags: (c) => {
            return {
                run: c.get('run').asBoolean(),
            };
        },
        args: ['--no-run'],
    });
});
