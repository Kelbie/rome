# `index.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test internal/js-parser/index.test.ts --update-snapshots` to update.

## `typescript > arrow-function > predicate-types`

### `ast`

```javascript
JSRoot {
	comments: Array []
	corrupt: false
	diagnostics: Array []
	directives: Array []
	filename: "typescript/arrow-function/predicate-types/input.ts"
	hasHoistedVars: false
	interpreter: undefined
	mtime: undefined
	sourceType: "module"
	syntax: Array ["ts"]
	loc: Object {
		filename: "typescript/arrow-function/predicate-types/input.ts"
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
		JSExpressionStatement {
			loc: Object {
				filename: "typescript/arrow-function/predicate-types/input.ts"
				end: Object {
					column: 30
					line: 1
				}
				start: Object {
					column: 0
					line: 1
				}
			}
			expression: JSArrowFunctionExpression {
				loc: Object {
					filename: "typescript/arrow-function/predicate-types/input.ts"
					end: Object {
						column: 29
						line: 1
					}
					start: Object {
						column: 0
						line: 1
					}
				}
				body: JSBooleanLiteral {
					value: true
					loc: Object {
						filename: "typescript/arrow-function/predicate-types/input.ts"
						end: Object {
							column: 29
							line: 1
						}
						start: Object {
							column: 25
							line: 1
						}
					}
				}
				head: JSFunctionHead {
					async: false
					hasHoistedVars: false
					rest: undefined
					thisType: undefined
					loc: Object {
						filename: "typescript/arrow-function/predicate-types/input.ts"
						end: Object {
							column: 24
							line: 1
						}
						start: Object {
							column: 0
							line: 1
						}
					}
					returnType: TSTypePredicate {
						asserts: false
						loc: Object {
							filename: "typescript/arrow-function/predicate-types/input.ts"
							end: Object {
								column: 21
								line: 1
							}
							start: Object {
								column: 10
								line: 1
							}
						}
						typeAnnotation: TSStringKeywordTypeAnnotation {
							loc: Object {
								filename: "typescript/arrow-function/predicate-types/input.ts"
								end: Object {
									column: 21
									line: 1
								}
								start: Object {
									column: 15
									line: 1
								}
							}
						}
						parameterName: JSIdentifier {
							name: "x"
							loc: Object {
								filename: "typescript/arrow-function/predicate-types/input.ts"
								identifierName: "x"
								end: Object {
									column: 11
									line: 1
								}
								start: Object {
									column: 10
									line: 1
								}
							}
						}
					}
					params: Array [
						JSBindingIdentifier {
							name: "x"
							loc: Object {
								filename: "typescript/arrow-function/predicate-types/input.ts"
								end: Object {
									column: 24
									line: 1
								}
								start: Object {
									column: 25
									line: 1
								}
							}
							meta: JSPatternMeta {
								optional: undefined
								loc: Object {
									filename: "typescript/arrow-function/predicate-types/input.ts"
									end: Object {
										column: 24
										line: 1
									}
									start: Object {
										column: 25
										line: 1
									}
								}
								typeAnnotation: TSAnyKeywordTypeAnnotation {
									loc: Object {
										filename: "typescript/arrow-function/predicate-types/input.ts"
										end: Object {
											column: 7
											line: 1
										}
										start: Object {
											column: 4
											line: 1
										}
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