"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const { css, cx } = require('emotion');
function Button(props) {
    return (React.createElement("div", { onClick: props.onClick, className: cx(css `
          display: inline-block;
          background-color: #121212;
          border-radius: 5px;
          cursor: pointer;
          border: 1px solid #303030;
          padding: 10px;
          line-height: 20px;

          &:hover {
            background-color: #1c1c1c;
          }
        `, props.className) }, props.children));
}
exports.default = Button;
