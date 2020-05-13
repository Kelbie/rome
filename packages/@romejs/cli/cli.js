"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@romejs/core");
const setProcessTitle_1 = require("./utils/setProcessTitle");
const cli_flags_1 = require("@romejs/cli-flags");
const path_1 = require("@romejs/path");
const Client_1 = require("@romejs/core/client/Client");
const commands_1 = require("@romejs/core/common/commands");
const fs_1 = require("@romejs/fs");
const fs = require("fs");
const string_markup_1 = require("@romejs/string-markup");
async function cli() {
    setProcessTitle_1.default('cli');
    const p = cli_flags_1.parseCLIFlagsFromProcess({
        programName: 'rome',
        usage: '[command] [flags]',
        version: core_1.VERSION,
        defineFlags(c) {
            // We need this to resolve other flags relative to
            // We do the word `void ||` nonsense to avoid setting a default flag value
            const cwd = c.get('cwd', {
                description: 'Specify a different working directory',
            }).asAbsoluteFilePathOrVoid() || path_1.createAbsoluteFilePath(process.cwd());
            return {
                clientFlags: {
                    clientName: 'cli',
                    cwd,
                    verbose: c.get('verbose', {
                        description: 'Output verbose logs',
                    }).asBoolean(core_1.DEFAULT_CLIENT_FLAGS.verbose),
                    silent: c.get('silent', {
                        description: "Don't write anything to the console",
                    }).asBoolean(core_1.DEFAULT_CLIENT_FLAGS.silent),
                    ...overrideClientFlags,
                },
                cliFlags: {
                    markersPath: c.get('markersPath', {
                        description: 'Path where to write markers. When ommitted defaults to Marker-TIMESTAMP.json',
                    }).asAbsoluteFilePathOrVoid(undefined, cwd),
                    profile: c.get('profile', {
                        description: 'Collect and write profile to disk. Includes profiles for all processes.',
                    }).asBoolean(false),
                    profilePath: c.get('profilePath', {
                        description: 'Path where to write profile. When omitted defaults to Profile-TIMESTAMP.json',
                    }).asAbsoluteFilePathOrVoid(undefined, cwd),
                    profileTimeout: c.get('profileTimeout', {
                        inputName: 'millisec',
                        description: 'Stop the profile after the milliseconds specified. When omitted the profile is of the whole command',
                    }).asNumberOrVoid(),
                    profileWorkers: c.get('profileWorkers', {
                        description: 'Exclude workers from profile',
                    }).asBoolean(true),
                    profileSampling: c.get('profileSampling', {
                        description: 'Profiler sampling interval in microseconds',
                        inputName: 'microsec',
                    }).asNumber(100),
                    temporaryDaemon: c.get('temporaryDaemon', {
                        description: "Start a daemon, if one isn't already running, for the lifetime of this command",
                    }).asBoolean(false),
                    rage: c.get('rage', {
                        description: 'Create a rage tarball of debug information',
                    }).asBoolean(false),
                    ragePath: c.get('ragePath', {
                        description: 'Path where to write rage tarball. When omitted defaults to Rage-TIMESTAMP.tgz',
                    }).asAbsoluteFilePathOrVoid(undefined, cwd),
                    logs: c.get('logs', {
                        description: 'Output master logs',
                    }).asBoolean(false),
                    logWorkers: c.get('logWorkers', {
                        description: 'Output worker logs',
                    }).asBooleanOrVoid(),
                    logPath: c.get('logPath', {
                        description: 'Path where to output logs. When omitted logs are not written anywhere',
                    }).asAbsoluteFilePathOrVoid(undefined, cwd),
                    ...overrideCLIFlags,
                },
                requestFlags: {
                    benchmark: c.get('benchmark', {
                        description: 'Run a command multiple times, calculating average',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.benchmark),
                    benchmarkIterations: c.get('benchmarkIterations', {
                        description: 'The amount of benchmark iterations to perform',
                    }).asNumber(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.benchmarkIterations),
                    collectMarkers: c.get('collectMarkers', {
                        description: 'Collect and write performance markers to disk',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.collectMarkers),
                    timing: c.get('timing', {
                        description: 'Dump timing information after running the command',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.timing),
                    review: c.get('review', {
                        description: 'Display and perform actions on diagnostics. Only some commands support this.',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.review),
                    watch: c.get('watch', {
                        description: 'Keep running command and update on file changes. Only some commands support this.',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.watch),
                    fieri: c.get('fieri', {
                        description: 'Head to flavortown',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.fieri),
                    grep: c.get('grep', {
                        description: 'Only display diagnostics with messages containing this string',
                    }).asString(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.grep),
                    inverseGrep: c.get('inverseGrep', {
                        description: 'Flip grep match. Only display diagnostics with messages that do NOT contain the grep string',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.inverseGrep),
                    maxDiagnostics: c.get('maxDiagnostics', {
                        description: 'Cap the amount of diagnostics displayed',
                    }).asNumber(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.maxDiagnostics),
                    verboseDiagnostics: c.get('verboseDiagnostics', {
                        description: 'Display hidden and truncated diagnostic information',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.verboseDiagnostics),
                    showAllDiagnostics: c.get('showAllDiagnostics', {
                        description: 'Display all diagnostics ignoring caps',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.showAllDiagnostics),
                    resolverPlatform: c.get('resolverPlatform', {
                        description: 'Specify the platform for module resolution',
                        inputName: 'platform',
                    }).asStringSetOrVoid(core_1.PLATFORMS),
                    resolverScale: c.get('resolverScale', {
                        description: 'Specify the image scale for module resolution',
                    }).asNumberOrVoid(),
                    resolverMocks: c.get('resolverMocks', {
                        description: 'Enable mocks for module resolution',
                    }).asBoolean(core_1.DEFAULT_CLIENT_REQUEST_FLAGS.resolverMocks),
                    ...overrideRequestFlags,
                },
            };
        },
    });
    let command = '';
    let overrideClientFlags;
    let overrideRequestFlags;
    let overrideCLIFlags = {};
    let commandFlags = {};
    let args = [];
    // Create command handlers. We use a set here since we may have some conflicting master and local command names. We always want the local command to take precedence.
    const commandNames = new Set([
        ...core_1.localCommands.keys(),
        ...core_1.masterCommands.keys(),
    ]);
    for (const cmd of commandNames) {
        const local = core_1.localCommands.get(cmd);
        if (local !== undefined) {
            p.command({
                name: cmd,
                category: local.category,
                description: local.description,
                defineFlags: local.defineFlags,
                ignoreFlags: local.ignoreFlags,
                examples: local.examples,
                usage: local.usage,
                callback(_commandFlags) {
                    commandFlags = _commandFlags;
                    args = p.getArgs();
                    command = cmd;
                },
            });
            continue;
        }
        const master = core_1.masterCommands.get(cmd);
        if (master !== undefined) {
            p.command({
                name: cmd,
                category: master.category,
                description: master.description,
                defineFlags: master.defineFlags,
                ignoreFlags: master.ignoreFlags,
                usage: master.usage,
                examples: master.examples,
                callback(_commandFlags) {
                    commandFlags = _commandFlags;
                    overrideClientFlags = master.overrideClientFlags;
                    overrideRequestFlags = master.overrideRequestFlags;
                    args = p.getArgs();
                    command = cmd;
                },
            });
        }
    }
    // Mock `rage` command that just uses the master noop command and adds the --rage flag
    p.command({
        name: 'rage',
        category: commands_1.commandCategories.INTERNAL,
        description: 'TODO',
        callback() {
            overrideCLIFlags = {
                rage: true,
            };
            command = '_noop';
        },
    });
    // Mock `logs` command that just uses the master noop command and adds the --logs flag
    p.command({
        name: 'logs',
        category: commands_1.commandCategories.INTERNAL,
        description: 'TODO',
        callback() {
            overrideCLIFlags = {
                logs: true,
            };
            command = '_noop';
        },
    });
    // Initialize flags
    let { clientFlags, cliFlags, requestFlags } = await p.init();
    // Force collection of markers if markersPath or we are raging
    if (cliFlags.markersPath || cliFlags.rage) {
        requestFlags.collectMarkers = true;
    }
    // Force logs when logPath or logWorkers is set
    if (cliFlags.logPath !== undefined || cliFlags.logWorkers === true) {
        cliFlags.logs = true;
    }
    p.commandRequired();
    const client = new core_1.Client({
        globalErrorHandlers: true,
        flags: clientFlags,
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
    });
    client.bridgeAttachedEvent.subscribe(async () => {
        const profileOptions = {
            samplingInterval: cliFlags.profileSampling,
            timeoutInterval: cliFlags.profileTimeout,
            includeWorkers: cliFlags.profileWorkers,
        };
        if (cliFlags.rage) {
            const { ragePath } = cliFlags;
            const filename = clientFlags.cwd.resolve(ragePath === undefined ? `Rage-${Client_1.getFilenameTimestamp()}.tgz` : ragePath).join();
            await client.rage(filename, profileOptions);
            return;
        }
        if (cliFlags.profile) {
            await client.profile(profileOptions, async (events) => {
                const { cwd } = clientFlags;
                const { profilePath } = cliFlags;
                const resolvedProfilePath = cwd.resolve(profilePath === undefined
                    ? `Profile-${Client_1.getFilenameTimestamp()}.json`
                    : profilePath);
                const str = JSON.stringify(events, undefined, '  ');
                await fs_1.writeFile(resolvedProfilePath, str);
                client.reporter.success(string_markup_1.markup `Wrote CPU profile to <filelink emphasis target="${resolvedProfilePath.join()}" />`);
            });
        }
        if (cliFlags.logs) {
            let fileout;
            if (cliFlags.logPath !== undefined) {
                fileout = fs.createWriteStream(clientFlags.cwd.resolve(cliFlags.logPath).join());
                client.endEvent.subscribe(() => {
                    if (fileout !== undefined) {
                        fileout.end();
                    }
                });
            }
            await client.subscribeLogs(cliFlags.logWorkers === true, (chunk) => {
                if (fileout === undefined) {
                    client.reporter.writeAll(chunk);
                }
                else {
                    fileout.write(chunk);
                }
            });
        }
    });
    if (cliFlags.temporaryDaemon) {
        await client.forceStartDaemon();
    }
    const res = await client.query({
        commandName: command,
        commandFlags,
        args,
        requestFlags,
        // Daemon would have been started before, so terminate when we complete
        terminateWhenIdle: cliFlags.temporaryDaemon,
        // We don't use the data result, so no point transporting it over the bridge
        noData: true,
    });
    await client.end();
    if (res.type === 'SUCCESS') {
        // Write markers if we were collecting them
        if (requestFlags.collectMarkers) {
            const markersPath = clientFlags.cwd.resolve(cliFlags.markersPath === undefined
                ? `Markers-${Client_1.getFilenameTimestamp()}.json`
                : cliFlags.markersPath);
            await fs_1.writeFile(markersPath, JSON.stringify(res.markers, null, '  '));
            client.reporter.success(string_markup_1.markup `Wrote markers to <filelink emphasis target="${markersPath.join()}" />`);
        }
    }
    switch (res.type) {
        case 'ERROR': {
            if (!res.handled) {
                console.error('Unhandled CLI query error');
                console.error(res.stack);
            }
            process.exit(1);
            break;
        }
        case 'INVALID_REQUEST': {
            if (res.showHelp) {
                await p.showHelp();
            }
            process.exit(1);
            break;
        }
        case 'DIAGNOSTICS': {
            process.exit(res.diagnostics.length === 0 ? 0 : 1);
            break;
        }
        case 'CANCELLED': {
            process.exit(0);
            break;
        }
        case 'SUCCESS': {
            process.exit(0);
            break;
        }
    }
}
exports.default = cli;
