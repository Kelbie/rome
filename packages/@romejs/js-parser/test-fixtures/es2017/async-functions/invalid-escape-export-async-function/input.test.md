# `index.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test packages/@romejs/js-parser/index.test.ts --update-snapshots` to update.

## `es2017 > async-functions > invalid-escape-export-async-function`

```javascript
Program {
  comments: Array []
  corrupt: false
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
      index: 43
      line: 2
    }
    start: Object {
      column: 0
      index: 0
      line: 1
    }
  }
  diagnostics: Array [
    Object {
      origins: Array [Object {category: 'js-parser'}]
      description: Object {
        advice: Array []
        category: 'parse/js'
        message: PARTIAL_BLESSED_DIAGNOSTIC_MESSAGE {value: 'Unexpected token, expected {'}
      }
      location: Object {
        filename: 'input.js'
        mtime: undefined
        sourceType: 'script'
        end: Object {
          column: 17
          index: 17
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
  body: Array [
    ExportLocalDeclaration {
      declaration: undefined
      exportKind: 'value'
      loc: Object {
        filename: 'input.js'
        end: Object {
          column: 42
          index: 42
          line: 1
        }
        start: Object {
          column: 0
          index: 0
          line: 1
        }
      }
      specifiers: Array [
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 17
              index: 17
              line: 1
            }
            start: Object {
              column: 7
              index: 7
              line: 1
            }
          }
          exported: Identifier {
            name: 'async'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 17
                index: 17
                line: 1
              }
              start: Object {
                column: 7
                index: 7
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: 'async'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 17
                index: 17
                line: 1
              }
              start: Object {
                column: 7
                index: 7
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 26
              index: 26
              line: 1
            }
            start: Object {
              column: 18
              index: 18
              line: 1
            }
          }
          exported: Identifier {
            name: 'function'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 26
                index: 26
                line: 1
              }
              start: Object {
                column: 18
                index: 18
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: 'function'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 26
                index: 26
                line: 1
              }
              start: Object {
                column: 18
                index: 18
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 28
              index: 28
              line: 1
            }
            start: Object {
              column: 27
              index: 27
              line: 1
            }
          }
          exported: Identifier {
            name: 'y'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 28
                index: 28
                line: 1
              }
              start: Object {
                column: 27
                index: 27
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: 'y'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 28
                index: 28
                line: 1
              }
              start: Object {
                column: 27
                index: 27
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 29
              index: 29
              line: 1
            }
            start: Object {
              column: 28
              index: 28
              line: 1
            }
          }
          exported: Identifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 29
                index: 29
                line: 1
              }
              start: Object {
                column: 28
                index: 28
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 29
                index: 29
                line: 1
              }
              start: Object {
                column: 28
                index: 28
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 30
              index: 30
              line: 1
            }
            start: Object {
              column: 29
              index: 29
              line: 1
            }
          }
          exported: Identifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 30
                index: 30
                line: 1
              }
              start: Object {
                column: 29
                index: 29
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 30
                index: 30
                line: 1
              }
              start: Object {
                column: 29
                index: 29
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 32
              index: 32
              line: 1
            }
            start: Object {
              column: 31
              index: 31
              line: 1
            }
          }
          exported: Identifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 32
                index: 32
                line: 1
              }
              start: Object {
                column: 31
                index: 31
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: ''
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 32
                index: 32
                line: 1
              }
              start: Object {
                column: 31
                index: 31
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 38
              index: 38
              line: 1
            }
            start: Object {
              column: 33
              index: 33
              line: 1
            }
          }
          exported: Identifier {
            name: 'await'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 38
                index: 38
                line: 1
              }
              start: Object {
                column: 33
                index: 33
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: 'await'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 38
                index: 38
                line: 1
              }
              start: Object {
                column: 33
                index: 33
                line: 1
              }
            }
          }
        }
        ExportLocalSpecifier {
          loc: Object {
            filename: 'input.js'
            end: Object {
              column: 40
              index: 40
              line: 1
            }
            start: Object {
              column: 39
              index: 39
              line: 1
            }
          }
          exported: Identifier {
            name: 'x'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 40
                index: 40
                line: 1
              }
              start: Object {
                column: 39
                index: 39
                line: 1
              }
            }
          }
          local: ReferenceIdentifier {
            name: 'x'
            loc: Object {
              filename: 'input.js'
              end: Object {
                column: 40
                index: 40
                line: 1
              }
              start: Object {
                column: 39
                index: 39
                line: 1
              }
            }
          }
        }
      ]
    }
  ]
}
```