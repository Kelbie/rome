"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const js_compiler_1 = require("@romejs/js-compiler");
const js_ast_1 = require("@romejs/js-ast");
const js_ast_utils_1 = require("@romejs/js-ast-utils");
const BAIL_EXIT = 'BAIL';
const KEEP_EXIT = 'KEEP';
/**
 * Validate the return value of an enter or exit transform
 */
function validateTransformReturn(transformName, node, path) {
    // Ignore some constants that will be handled later
    if (node === js_compiler_1.REDUCE_REMOVE) {
        return;
    }
    // If this function hits a symbol then it's invalid as we would have dealt with it before if it were a valid constant
    if (typeof node === 'symbol') {
        throw new Error(`Returned a symbol from transform ${transformName} that doesn't correspond to any reduce constant`);
    }
    // Verify common mistake of forgetting to return something
    if (typeof node === 'undefined') {
        throw new Error('Returned `undefined` from transform ' +
            transformName +
            '. If you meant to delete this node then use `return' +
            ' REDUCE_REMOVE`, otherwise if you want to keep it then use `return path.node;`');
    }
    // Handle returning an array of nodes
    if (Array.isArray(node)) {
        // keyed nodes cannot be replaced with an array of nodes
        if (path.opts.noArrays === true) {
            throw new Error(`Cannot replace this keyed node ${path.parent.type}[${path.opts.nodeKey}] with an array of nodes - originated from transform ${transformName}`);
        }
        return;
    }
    // Verify that it's a valid node
    if (!js_ast_utils_1.isNodeLike(node)) {
        throw new Error(`Expected a return value of a plain object with a \`type\` property or a reduce constant - originated from 'transform ${transformName}`);
    }
}
/**
 * Given a return value from a transform, determine if we should bail out.
 * Bailing out means returning the actual node and making the parent reduce
 * call handle it (if any).
 */
function shouldBailReduce(node) {
    if (Array.isArray(node)) {
        // We just return the array of nodes, without transforming them
        // reduce() calls higher in the chain will splice this array and do it's
        // own transform call so when the transform is performed on the node it's
        // in it's correct place in the tree
        return true;
    }
    // This node is being removed, no point recursing into it
    if (node === js_compiler_1.REDUCE_REMOVE) {
        return true;
    }
    return false;
}
/**
 * Run an exit handler. We will return a tuple marking whether we should bail
 * with the returned value.
 */
function runExit(path, name, callback, state) {
    // Call transformer
    let transformedNode = callback(path, state);
    // Validate the node
    validateTransformReturn(name, transformedNode, path);
    // Check if we need to bail out
    if (shouldBailReduce(transformedNode)) {
        return [BAIL_EXIT, transformedNode];
    }
    // create new path if node has been changed
    if (transformedNode !== path.node) {
        path = path.fork(transformedNode);
    }
    return [KEEP_EXIT, path];
}
function reduce(origNode, visitors, context, pathOpts = {}) {
    // Initialize first path
    let path = new js_compiler_1.Path(origNode, context, pathOpts);
    // Perform enter transforms
    for (const visitor of visitors) {
        const { enter } = visitor;
        if (enter === undefined) {
            continue;
        }
        // Call transformer
        let transformedNode = enter(path);
        // When returning this symbol, it indicates we should skip the subtree
        if (transformedNode === js_compiler_1.REDUCE_SKIP_SUBTREE) {
            return origNode;
        }
        // Validate the return value
        validateTransformReturn(visitor.name, transformedNode, path);
        // Check if we need to bail out. See the comment for shouldBailReduce on what that means
        if (shouldBailReduce(transformedNode)) {
            return transformedNode;
        }
        // Create new path if node has been changed
        if (transformedNode !== path.node) {
            path = path.fork(transformedNode);
        }
    }
    // Reduce the children
    let { node } = path;
    const visitorKeys = js_ast_1.visitorKeys.get(node.type);
    if (visitorKeys !== undefined) {
        // Build the ancestry paths that we'll pass to each child path
        const ancestryPaths = pathOpts.ancestryPaths || [];
        let childAncestryPaths = [path].concat(ancestryPaths);
        // Reduce the children
        for (const key of visitorKeys) {
            // rome-ignore lint/noExplicitAny
            const oldVal = node[key];
            if (Array.isArray(oldVal)) {
                let children = oldVal;
                // When removing items from the children array, we decrement this offset and subtract it
                // whenever looking up to get the correct position
                let childrenOffset = 0;
                // This needs to be calculated beforehand as the length of the array may change when removing
                // items
                let length = children.length;
                for (let i = 0; i < length; i++) {
                    // Calculate the correct index that this children can be found at
                    const correctedIndex = childrenOffset + i;
                    // Get the child
                    const child = children[correctedIndex];
                    // An array may be mixed containing [undefined, Node] etc so check that it's actually a valid node
                    // An example of a property with empty elements is an ArrayExpression with holes
                    if (js_ast_utils_1.isNodeLike(child)) {
                        // Run transforms on this node
                        const newChild = reduce(child, visitors, context, {
                            noScopeCreation: pathOpts.noScopeCreation,
                            parentScope: path.scope,
                            ancestryPaths: childAncestryPaths,
                            listKey: correctedIndex,
                            nodeKey: key,
                        });
                        // If this item has been changed then...
                        if (newChild !== child && !context.frozen) {
                            // Clone the children array
                            children = children.slice();
                            // Check if the item is to be deleted
                            // REDUCE_REMOVE or an empty array are considered equivalent
                            if (newChild === js_compiler_1.REDUCE_REMOVE ||
                                (Array.isArray(newChild) && newChild.length === 0)) {
                                // Remove the item from the array
                                children.splice(correctedIndex, 1);
                                // Since the array now has one less item, change the offset so all
                                // future indices will be correct
                                childrenOffset--;
                            }
                            else if (Array.isArray(newChild)) {
                                // Remove the previous, and add the new items to the array
                                children.splice(correctedIndex, 1, ...newChild);
                                // We increase the length of the array so that this loop covers
                                // the newly inserted nodes
                                // `childrenOffset` is not used here because that's just used to
                                // skip elements
                                length += newChild.length;
                                // Revisit the current index, this is necessary as there's now a
                                // new node at this position
                                i--;
                            }
                            else {
                                // Otherwise it's a valid node so set it
                                children[correctedIndex] = newChild;
                                // Revisit the current index, the node has changed and some
                                // transforms may care about it
                                i--;
                            }
                            // Mutate the original node - funky typing since Flow doesn't understand the mutation
                            node = { ...node, [key]: children };
                            // Create a new node path
                            path = path.fork(node);
                            // And create a new ancestry array for subsequent children
                            childAncestryPaths = [path].concat(ancestryPaths);
                        }
                    }
                }
            }
            else if (js_ast_utils_1.isNodeLike(oldVal)) {
                // Run transforms on this node
                let newVal = reduce(oldVal, visitors, context, {
                    noScopeCreation: pathOpts.noScopeCreation,
                    parentScope: path.scope,
                    ancestryPaths: childAncestryPaths,
                    noArrays: true,
                    nodeKey: key,
                });
                // If this value has been changed then...
                if (newVal !== oldVal && !context.frozen) {
                    // When replacing a key value, we cannot replace it with an array
                    if (Array.isArray(newVal)) {
                        throw new Error(`Cannot replace a key value node with an array of nodes`);
                    }
                    // If the node is deleted then use `void` instead
                    if (newVal === js_compiler_1.REDUCE_REMOVE) {
                        newVal = undefined;
                    }
                    // Mutate the original object - funky typing since Flow doesn't understand the mutation
                    node = { ...node, [key]: newVal };
                    // Create a new node path for it
                    path = path.fork(node);
                    // And create a new ancestry array for subsequent children
                    childAncestryPaths = [path].concat(ancestryPaths);
                }
            }
            else {
                // not sure what this is...
                continue;
            }
        }
    }
    // Run all exit hooks
    for (const ref of path.hooks) {
        const { exit } = ref.descriptor;
        if (exit === undefined) {
            // A hook exit method is optional
            continue;
        }
        const res = runExit(path, ref.descriptor.name, exit, ref.state);
        if (res[0] === BAIL_EXIT) {
            return res[1];
        }
        else {
            path = res[1];
        }
    }
    // Run exit transforms
    for (const visitor of visitors) {
        if (visitor.exit !== undefined) {
            const res = runExit(path, visitor.name, visitor.exit, undefined);
            if (res[0] === BAIL_EXIT) {
                return res[1];
            }
            else {
                path = res[1];
            }
        }
    }
    return path.node;
}
exports.default = reduce;
