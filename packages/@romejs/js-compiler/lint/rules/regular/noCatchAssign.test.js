"use strict";
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const rome_1 = require("rome");
const testHelpers_1 = require("../testHelpers");
rome_1.test('no exception assign', async (t) => {
    await testHelpers_1.testLintMultiple(t, [
        // VALID
        `try { } catch (e) { three = 2 + 1; }`,
        'try { } catch ({e}) { this.something = 2; }',
        'function foo() { try { } catch (e) { return false; } }',
        // INVALID
        'try { } catch (e) { e; e = 10; }',
        "try { } catch (ex) { console.log('test'); ex = 10; }",
        'try { } catch (ex) { [ex, test] = []; }',
        "try { } catch ({message, name}) { message = 'test'; name = 10; }",
        'try { } catch (ex) { ({x: ex = 0} = {}); }',
        'try { } catch (ex) { let a; ({x: a = ex = 0} = {}); }',
    ], { category: 'lint/noCatchAssign' });
});
