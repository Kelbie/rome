# `index.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test internal/js-parser/index.test.ts --update-snapshots` to update.

## `esprima > invalid-syntax > migrated_0275`

### `ast`

```javascript
JSRoot {
	comments: Array []
	corrupt: false
	directives: Array []
	filename: "esprima/invalid-syntax/migrated_0275/input.js"
	hasHoistedVars: false
	interpreter: undefined
	mtime: undefined
	sourceType: "script"
	syntax: Array []
	loc: Object {
		filename: "esprima/invalid-syntax/migrated_0275/input.js"
		end: Object {
			column: 0
			line: 2
		}
		start: Object {
			column: 0
			line: 1
		}
	}
	diagnostics: Array [
		Object {
			origins: Array [Object {category: "parse/js"}]
			description: Object {
				advice: Array []
				category: "parse/js"
				message: MARKUP {parts: Array [RAW_MARKUP {value: "Unknown class property start"}]}
			}
			location: Object {
				filename: "esprima/invalid-syntax/migrated_0275/input.js"
				mtime: undefined
				sourceText: undefined
				end: Object {
					column: 10
					line: 1
				}
				start: Object {
					column: 11
					line: 1
				}
			}
		}
	]
	body: Array [
		JSClassDeclaration {
			id: JSBindingIdentifier {
				name: "A"
				loc: Object {
					filename: "esprima/invalid-syntax/migrated_0275/input.js"
					identifierName: "A"
					end: Object {
						column: 7
						line: 1
					}
					start: Object {
						column: 6
						line: 1
					}
				}
			}
			loc: Object {
				filename: "esprima/invalid-syntax/migrated_0275/input.js"
				end: Object {
					column: 22
					line: 1
				}
				start: Object {
					column: 0
					line: 1
				}
			}
			meta: JSClassHead {
				implements: undefined
				superClass: undefined
				superTypeParameters: undefined
				typeParameters: undefined
				loc: Object {
					filename: "esprima/invalid-syntax/migrated_0275/input.js"
					end: Object {
						column: 22
						line: 1
					}
					start: Object {
						column: 0
						line: 1
					}
				}
				body: Array [
					JSClassMethod {
						kind: "method"
						key: JSStaticPropertyKey {
							value: JSIdentifier {
								name: "static"
								loc: Object {
									filename: "esprima/invalid-syntax/migrated_0275/input.js"
									identifierName: "static"
									end: Object {
										column: 17
										line: 1
									}
									start: Object {
										column: 11
										line: 1
									}
								}
							}
							loc: Object {
								filename: "esprima/invalid-syntax/migrated_0275/input.js"
								identifierName: "static"
								end: Object {
									column: 17
									line: 1
								}
								start: Object {
									column: 11
									line: 1
								}
							}
						}
						loc: Object {
							filename: "esprima/invalid-syntax/migrated_0275/input.js"
							end: Object {
								column: 21
								line: 1
							}
							start: Object {
								column: 11
								line: 1
							}
						}
						body: JSBlockStatement {
							body: Array []
							directives: Array []
							loc: Object {
								filename: "esprima/invalid-syntax/migrated_0275/input.js"
								end: Object {
									column: 21
									line: 1
								}
								start: Object {
									column: 19
									line: 1
								}
							}
						}
						meta: JSClassPropertyMeta {
							abstract: false
							accessibility: undefined
							optional: false
							readonly: false
							static: false
							typeAnnotation: undefined
							loc: Object {
								filename: "esprima/invalid-syntax/migrated_0275/input.js"
								end: Object {
									column: 17
									line: 1
								}
								start: Object {
									column: 11
									line: 1
								}
							}
						}
						head: JSFunctionHead {
							async: false
							generator: false
							hasHoistedVars: false
							params: Array []
							rest: undefined
							returnType: undefined
							thisType: undefined
							typeParameters: undefined
							loc: Object {
								filename: "esprima/invalid-syntax/migrated_0275/input.js"
								end: Object {
									column: 19
									line: 1
								}
								start: Object {
									column: 17
									line: 1
								}
							}
						}
					}
				]
			}
		}
	]
}
```

### `diagnostics`

```

 esprima/invalid-syntax/migrated_0275/input.js:1:11 parse/js ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Unknown class property start

    class A {a static(){}}
               ^

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```