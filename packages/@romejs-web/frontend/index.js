"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("@romejs/events");
const ClientPage_1 = require("./ClientPage");
const Button_1 = require("./Button");
const Spinner_1 = require("./Spinner");
const React = require("react");
const ReactDOM = require("react-dom");
const string_utils_1 = require("@romejs/string-utils");
const { css, injectGlobal } = require('emotion');
injectGlobal `
  html, body {
    min-height: 100%;
    width: 100%;
  }

  body {
    font-family: Helvetica, Arial, sans-serif;
    background-color: #2c2c2c;
    color: #fff;
  }
`;
// Temporary, from node_modules/xterm/lib/xterm.css
injectGlobal `
/**
 * Copyright (c) 2014 The xterm.js authors. All rights reserved.
 * Copyright (c) 2012-2013, Christopher Jeffrey (MIT License)
 * https://github.com/chjj/term.js
 * @license MIT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Originally forked from (with the author's permission):
 *   Fabrice Bellard's javascript vt100 for jslinux:
 *   http://bellard.org/jslinux/
 *   Copyright (c) 2011 Fabrice Bellard
 *   The original design remains. The terminal itself
 *   has been extended to include xterm CSI codes, among
 *   other features.
 */

/**
 *  Default styles for xterm.js
 */

.xterm {
    font-feature-settings: "liga" 0;
    position: relative;
    user-select: none;
    -ms-user-select: none;
    -webkit-user-select: none;
}

.xterm.focus,
.xterm:focus {
    outline: none;
}

.xterm .xterm-helpers {
    position: absolute;
    top: 0;
    /**
     * The z-index of the helpers must be higher than the canvases in order for
     * IMEs to appear on top.
     */
    z-index: 10;
}

.xterm .xterm-helper-textarea {
    /*
     * HACK: to fix IE's blinking cursor
     * Move textarea out of the screen to the far left, so that the cursor is not visible.
     */
    position: absolute;
    opacity: 0;
    left: -9999em;
    top: 0;
    width: 0;
    height: 0;
    z-index: -10;
    /** Prevent wrapping so the IME appears against the textarea at the correct position */
    white-space: nowrap;
    overflow: hidden;
    resize: none;
}

.xterm .composition-view {
    /* TODO: Composition position got messed up somewhere */
    background: #000;
    color: #FFF;
    display: none;
    position: absolute;
    white-space: nowrap;
    z-index: 1;
}

.xterm .composition-view.active {
    display: block;
}

.xterm .xterm-viewport {
    /* On OS X this is required in order for the scroll bar to appear fully opaque */
    background-color: #000;
    overflow-y: scroll;
    cursor: default;
    position: absolute;
    right: 0;
    left: 0;
    top: 0;
    bottom: 0;
}

.xterm .xterm-screen {
    position: relative;
}

.xterm .xterm-screen canvas {
    position: absolute;
    left: 0;
    top: 0;
}

.xterm .xterm-scroll-area {
    visibility: hidden;
}

.xterm-char-measure-element {
    display: inline-block;
    visibility: hidden;
    position: absolute;
    top: 0;
    left: -9999em;
    line-height: normal;
}

.xterm {
    cursor: text;
}

.xterm.enable-mouse-events {
    /* When mouse events are enabled (eg. tmux), revert to the standard pointer cursor */
    cursor: default;
}

.xterm.xterm-cursor-pointer {
    cursor: pointer;
}

.xterm.column-select.focus {
    /* Column selection mode */
    cursor: crosshair;
}

.xterm .xterm-accessibility,
.xterm .xterm-message {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 100;
    color: transparent;
}

.xterm .live-region {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}

.xterm-dim {
    opacity: 0.5;
}

.xterm-underline {
    text-decoration: underline;
}

`;
const DataContext = React.createContext({
    clients: [],
    requests: [],
});
function ClientItem({ client, setFocused, }) {
    const endTime = client.endTime === undefined ? Date.now() : client.endTime;
    const elapsed = endTime - client.startTime;
    const data = React.useContext(DataContext);
    const requests = data.requests.filter(req => req.client === client.id);
    const requestCount = new Map();
    for (const request of requests) {
        let count = requestCount.get(request.query.commandName);
        if (count === undefined) {
            count = 0;
        }
        count++;
        requestCount.set(request.query.commandName, count);
    }
    let backgroundColor = '#121212';
    const lastRequest = requests[requests.length - 1];
    if (lastRequest !== undefined && lastRequest.response !== undefined) {
        const lastResponse = lastRequest.response;
        if (lastResponse.type === 'SUCCESS') {
            backgroundColor = '#2DC55E';
        }
        else if (lastResponse.type === 'ERROR') {
            backgroundColor = 'orange';
        }
        else if (lastResponse.type === 'DIAGNOSTICS') {
            backgroundColor = '#F81118';
        }
    }
    return (React.createElement(Button_1.default, { key: client.id, onClick: setFocused, className: css `
        width: 300px;
        height: 100px;
        padding: 15px;
        margin-bottom: 15px;
        margin-right: 15px;
        position: relative;
        background-color: ${backgroundColor};
      ` },
        React.createElement("div", { className: css `
          font-weight: bold;
        ` },
            client.flags.clientName,
            " #",
            String(client.id),
            ' ',
            client.endTime !== undefined ? React.createElement(Spinner_1.default, null) : null),
        React.createElement("ul", null, Array.from(requestCount, ([commandName, count]) => {
            return (React.createElement("li", { key: commandName },
                commandName,
                count === 1 ? '' : ` x ${String(count)}`));
        })),
        React.createElement("div", { className: css `
          position: absolute;
          right: 15px;
          bottom: 15px;
        ` }, string_utils_1.humanizeTime(elapsed))));
}
function Content() {
    const data = React.useContext(DataContext);
    const [focusedClientId, setFocusedClient] = React.useState(undefined);
    let focusedClient;
    if (focusedClientId !== undefined) {
        focusedClient = data.clients.find(client => client.id === focusedClientId);
    }
    if (focusedClient === undefined) {
        return (React.createElement(React.Fragment, null, data.clients.map(client => {
            return (React.createElement(ClientItem, { key: client.id, client: client, setFocused: () => {
                    setFocusedClient(client.id);
                } }));
        })));
    }
    else {
        const actualFocusClient = focusedClient;
        const requests = data.requests.filter(req => req.client === actualFocusClient.id);
        return (React.createElement(ClientPage_1.default, { client: actualFocusClient, requests: requests, goBack: () => {
                setFocusedClient(undefined);
            } }));
    }
}
function Container(props) {
    return (React.createElement("div", { className: css `
        padding: 15px;
      ` }, props.children));
}
function App(props) {
    return (React.createElement(DataContext.Provider, { value: props },
        React.createElement(Container, null,
            React.createElement(Content, null))));
}
const socket = new WebSocket('ws://localhost:8081/websocket', 'rome');
const bridge = events_1.createBridgeFromBrowserWebSocket(events_1.Bridge, socket, {
    type: 'server',
});
const event = bridge.createEvent({
    name: 'WebBridge.requests',
    direction: 'server<-client',
});
event.subscribe((({ requests, clients }) => {
    ReactDOM.render(React.createElement(App, { requests: requests, clients: clients }), document.querySelector('#app'));
}));
socket.onopen = () => {
    console.log('HANDSHAKE START');
    bridge.handshake({ second: true }).then(() => {
        console.log('HANDSHAKE END');
    });
};
