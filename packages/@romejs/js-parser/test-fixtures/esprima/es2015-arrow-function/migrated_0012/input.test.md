# `index.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test packages/@romejs/js-parser/index.test.ts --update-snapshots` to update.

## `esprima > es2015-arrow-function > migrated_0012`

```javascript
Program {
  comments: Array []
  corrupt: false
  diagnostics: Array []
  directives: Array []
  filename: 'input.js'
  hasHoistedVars: false
  interpreter: undefined
  mtime: undefined
  sourceType: 'script'
  syntax: Array []
  loc: Object {
    filename: 'input.js'
    end: Object {
      column: 0
      index: 16
      line: 2
    }
    start: Object {
      column: 0
      index: 0
      line: 1
    }
  }
  body: Array [
    ExpressionStatement {
      loc: Object {
        filename: 'input.js'
        end: Object {
          column: 15
          index: 15
          line: 1
        }
        start: Object {
          column: 0
          index: 0
          line: 1
        }
      }
      expression: ArrowFunctionExpression {
        loc: Object {
          filename: 'input.js'
          end: Object {
            column: 15
            index: 15
            line: 1
          }
          start: Object {
            column: 0
            index: 0
            line: 1
          }
        }
        body: NumericLiteral {
          value: 42
          format: undefined
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 15
              index: 15
              line: 1
            }
            start: Object {
              column: 13
              index: 13
              line: 1
            }
          }
        }
        head: FunctionHead {
          async: false
          hasHoistedVars: false
          predicate: undefined
          rest: undefined
          returnType: undefined
          thisType: undefined
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 13
              index: 13
              line: 1
            }
            start: Object {
              column: 0
              index: 0
              line: 1
            }
          }
          params: Array [
            BindingIdentifier {
              name: 'eval'
              loc: Object {
                filename: 'input.js'
                end: Object {
                  column: 5
                  index: 5
                  line: 1
                }
                start: Object {
                  column: 1
                  index: 1
                  line: 1
                }
              }
            }
            BindingIdentifier {
              name: 'a'
              loc: Object {
                filename: 'input.js'
                end: Object {
                  column: 8
                  index: 8
                  line: 1
                }
                start: Object {
                  column: 7
                  index: 7
                  line: 1
                }
              }
            }
          ]
        }
      }
    }
  ]
}
```