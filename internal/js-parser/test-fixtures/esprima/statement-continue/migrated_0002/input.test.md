# `index.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test internal/js-parser/index.test.ts --update-snapshots` to update.

## `esprima > statement-continue > migrated_0002`

### `ast`

```javascript
JSRoot {
	comments: Array []
	corrupt: false
	diagnostics: Array []
	directives: Array []
	filename: "esprima/statement-continue/migrated_0002/input.js"
	hasHoistedVars: false
	interpreter: undefined
	mtime: undefined
	sourceType: "script"
	syntax: Array []
	loc: Object {
		filename: "esprima/statement-continue/migrated_0002/input.js"
		end: Object {
			column: 0
			line: 2
		}
		start: Object {
			column: 0
			line: 1
		}
	}
	body: Array [
		JSLabeledStatement {
			loc: Object {
				filename: "esprima/statement-continue/migrated_0002/input.js"
				end: Object {
					column: 36
					line: 1
				}
				start: Object {
					column: 0
					line: 1
				}
			}
			label: JSIdentifier {
				name: "done"
				loc: Object {
					filename: "esprima/statement-continue/migrated_0002/input.js"
					identifierName: "done"
					end: Object {
						column: 4
						line: 1
					}
					start: Object {
						column: 0
						line: 1
					}
				}
			}
			body: JSWhileStatement {
				loc: Object {
					filename: "esprima/statement-continue/migrated_0002/input.js"
					end: Object {
						column: 36
						line: 1
					}
					start: Object {
						column: 6
						line: 1
					}
				}
				test: JSBooleanLiteral {
					value: true
					loc: Object {
						filename: "esprima/statement-continue/migrated_0002/input.js"
						end: Object {
							column: 17
							line: 1
						}
						start: Object {
							column: 13
							line: 1
						}
					}
				}
				body: JSBlockStatement {
					directives: Array []
					loc: Object {
						filename: "esprima/statement-continue/migrated_0002/input.js"
						end: Object {
							column: 36
							line: 1
						}
						start: Object {
							column: 19
							line: 1
						}
					}
					body: Array [
						JSContinueStatement {
							loc: Object {
								filename: "esprima/statement-continue/migrated_0002/input.js"
								end: Object {
									column: 34
									line: 1
								}
								start: Object {
									column: 21
									line: 1
								}
							}
							label: JSIdentifier {
								name: "done"
								loc: Object {
									filename: "esprima/statement-continue/migrated_0002/input.js"
									identifierName: "done"
									end: Object {
										column: 34
										line: 1
									}
									start: Object {
										column: 30
										line: 1
									}
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

### `diagnostics`

```
✔ No known problems!

```