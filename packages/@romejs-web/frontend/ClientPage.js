"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const Spinner_1 = require("./Spinner");
const Button_1 = require("./Button");
const { css } = require('emotion');
const xterm = require('xterm');
const fit = require('xterm/lib/addons/fit/fit');
xterm.Terminal.applyAddon(fit);
function SubHeading(props) {
    return (React.createElement("h2", { className: css `
        font-size: 20px;
        font-weight: bold;
        margin: 10px 0;
      ` }, props.children));
}
function Code(props) {
    return (React.createElement("span", { className: css `
        font-family: monospace;
        background-color: rgba(0, 0, 0, 0.5);
        padding: 5px;
      ` }, props.children));
}
function Tick(props) {
    if (props.value) {
        return (React.createElement("span", { className: css `
          color: green;
          font-weight: bold;
        ` }, "\u2714"));
    }
    else {
        return (React.createElement("span", { className: css `
          color: red;
          font-weight: bold;
        ` }, "\u2716"));
    }
}
function Inspect(props) {
    const entries = Object.entries(Object(props.value));
    if (entries.length === 0) {
        return React.createElement(Ommission, null,
            "No ",
            props.name,
            " specified");
    }
    return (React.createElement("ul", { className: css `
        columns: 340px;
      ` }, entries
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => {
        let valueElem;
        if (typeof value === 'boolean') {
            valueElem = React.createElement(Tick, { value: value });
        }
        else {
            valueElem = React.createElement(Code, null, JSON.stringify(value));
        }
        return (React.createElement("li", { key: key, className: css `
                line-height: 30px;
              ` },
            React.createElement(Code, null, key),
            " ",
            valueElem));
    })));
}
function Terminal(props) {
    const ref = React.useRef(null);
    React.useEffect(() => {
        var term = new xterm.Terminal({
            convertEol: true,
            fontFamily: 'Fira Code',
            fontSize: 16,
            theme: {
                foreground: '#D6DBE5',
                background: '#131313',
                black: '#1F1F1F',
                red: '#F81118',
                green: '#2DC55E',
                yellow: '#ECBA0F',
                blue: '#2A84D2',
                magenta: '#4E5AB7',
                cyan: '#1081D6',
                white: '#D6DBE5',
                brightBlack: '#D6DBE5',
                brightRed: '#DE352E',
                brightGreen: '#1DD361',
                brightYellow: '#F3BD09',
                brightBlue: '#1081D6',
                brightMagenta: '#5350B9',
                brightCyan: '#0F7DDB',
                brightWhite: '#FFFFFF',
            },
        });
        term.open(ref.current);
        term.write(props.value);
        term.fit();
    }, [props.value]);
    return React.createElement("div", { ref: ref });
}
function Ommission(props) {
    return (React.createElement("div", { className: css `
        font-style: italic;
        text-align: center;
        margin-bottom: 10px;
      ` }, props.children));
}
function doesMarkerOverlap(a, b) {
    return !(a.start >= b.end || a.start >= b.end);
}
const colors = ['#f39237', '#bf1363', '#0e79b2'];
function Markers({ request }) {
    const { markers } = request;
    if (markers.length === 0) {
        return (React.createElement(Ommission, null, "No markers created. This requests did not trigger any worker communication."));
    }
    const start = request.startTime;
    let end = request.endTime;
    if (end === undefined) {
        end = markers[markers.length - 1].end;
    }
    const rows = [];
    for (const marker of markers.slice().sort(a => a.end - a.start)) {
        let row;
        // Find row without an overlapping marker
        for (const checkRow of rows) {
            let hasOverlapping = false;
            for (const checkMarker of checkRow) {
                if (doesMarkerOverlap(marker, checkMarker)) {
                    hasOverlapping = true;
                    break;
                }
            }
            if (!hasOverlapping) {
                row = checkRow;
                break;
            }
        }
        if (row === undefined) {
            row = [];
            rows.push(row);
        }
        row.push(marker);
    }
    rows.sort((a, b) => b.length - a.length);
    const methodToColor = new Map();
    let nextColorIndex = 0;
    return (React.createElement("div", { className: css `
        overflow: auto;
        max-height: 400px;
      ` },
        React.createElement("div", { className: css `
          position: relative;
          width: ${end - start}px;
          height: ${rows.length * 40}px;
        ` }, rows.map((row, i) => {
            return row.map((marker, i2) => {
                let color = methodToColor.get(marker.facet);
                if (color === undefined) {
                    color = colors[nextColorIndex];
                    methodToColor.set(marker.facet, color);
                    nextColorIndex++;
                    if (nextColorIndex === colors.length) {
                        nextColorIndex = 0;
                    }
                }
                return (React.createElement("div", { key: `${i}:${i2}`, title: marker.label, className: css `
                  background-color: ${color};
                  position: absolute;
                  top: ${i * 40}px;
                  height: 30px;
                  line-height: 30px;
                  box-sizing: border-box;
                  left: ${marker.start - start}px;
                  width: ${marker.end - marker.start}px;
                  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
                ` }));
            });
        }))));
}
function Request({ request }) {
    const { query } = request;
    let backgroundColor = 'rgba(255, 255, 255, 0.1)';
    let responseElem;
    const { response } = request;
    if (response === undefined) {
        responseElem = React.createElement("div", null, "Response still pending");
    }
    else if (response.type === 'SUCCESS') {
        if (response.data === undefined) {
            if (query.noData && !response.hasData) {
                responseElem = (React.createElement(Ommission, null, "Response included no data. Most likely due to the noData query option."));
            }
            else {
                responseElem = React.createElement(Ommission, null, "Response included no data");
            }
        }
        else {
            responseElem = React.createElement("div", null, "SUCCESS");
        }
        backgroundColor = 'rgb(45, 197, 94, 0.5)';
    }
    else if (response.type === 'DIAGNOSTICS') {
        backgroundColor = 'rgb(248, 17, 24, 0.5)';
        responseElem = React.createElement(Ommission, null, "TODO PRINT DIAGNOSTICS HERE");
    }
    else if (response.type === 'ERROR') {
        backgroundColor = 'orange';
        responseElem = React.createElement("div", null, "TODO PRODUCE ERROR");
    }
    return (React.createElement("div", { className: css `
        background-color: ${backgroundColor};
        border-radius: 5px;
        padding: 10px;
      ` },
        React.createElement(SubHeading, null,
            query.commandName,
            " ",
            request.endTime !== undefined ? React.createElement(Spinner_1.default, null) : null),
        React.createElement(Inspect, { name: "request options", value: {
                silent: query.silent,
                noData: query.noData,
                terminateWhenIdle: query.terminateWhenIdle,
            } }),
        React.createElement(SubHeading, null, "Command Flags"),
        React.createElement(Inspect, { name: "command flags", value: query.commandFlags }),
        React.createElement(SubHeading, null, "Arguments"),
        React.createElement("ol", { className: css `
          columns: 340px;
        ` }, query.args.map((arg, i) => {
            return (React.createElement("li", { key: i, className: css `
                margin-left: 20px;
                list-style: decimal;
                line-height: 30px;
              ` },
                React.createElement(Code, null, arg)));
        })),
        React.createElement(SubHeading, null, "Response"),
        responseElem,
        React.createElement(SubHeading, null, "Markers"),
        React.createElement(Markers, { request: request })));
}
function ClientPage({ client, requests, goBack, }) {
    return (React.createElement(React.Fragment, null,
        React.createElement("h1", { className: css `
          line-height: 42px;
          vertical-align: middle;
          margin-bottom: 20px;
        ` },
            React.createElement(Button_1.default, { className: css `
            float: left;
          `, onClick: goBack }, "Back"),
            React.createElement("span", { className: css `
            font-size: 30px;
            font-weight: bold;
            margin-left: 20px;
          ` },
                "#",
                String(client.id),
                " ",
                client.flags.clientName,
                ' ',
                client.endTime !== undefined ? React.createElement(Spinner_1.default, null) : null)),
        React.createElement(SubHeading, null, "Flags"),
        React.createElement(Inspect, { name: "client flags", value: client.flags }),
        React.createElement(SubHeading, null, "Console"),
        React.createElement(Terminal, { value: client.stdoutAnsi }),
        React.createElement(SubHeading, null, "HTML"),
        React.createElement(Terminal, { value: client.stdoutHTML }),
        React.createElement(SubHeading, null, "Requests"),
        requests.map(request => {
            return React.createElement(Request, { key: request.id, request: request });
        })));
}
exports.default = ClientPage;
