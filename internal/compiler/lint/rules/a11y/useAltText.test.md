# `harness.test.ts`

**DO NOT MODIFY**. This file has been autogenerated. Run `rome test internal/compiler/lint/rules/harness.test.ts --update-snapshots` to update.

## `a11y/useAltText`

### `0`

```

 lint/a11y/useAltText/reject/1/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" />
    ^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `0: formatted`

```jsx
<img src="foo" />;

```

### `1`

```

 lint/a11y/useAltText/reject/2/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img {...props} />
    ^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `1: formatted`

```jsx
<img {...props} />;

```

### `2`

```

 lint/a11y/useAltText/reject/3/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img {...props} alt={undefined} />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `2: formatted`

```jsx
<img {...props} alt={undefined} />;

```

### `3`

```

 lint/a11y/useAltText/reject/4/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" role="presentation" />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `3: formatted`

```jsx
<img src="foo" role="presentation" />;

```

### `4`

```

 lint/a11y/useAltText/reject/5/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" role="none" />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `4: formatted`

```jsx
<img src="foo" role="none" />;

```

### `5`

```

 lint/a11y/useAltText/reject/6/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <object {...props} />
    ^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `5: formatted`

```jsx
<object {...props} />;

```

### `6`

```

 lint/a11y/useAltText/reject/7/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <object aria-label={undefined} />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `6: formatted`

```jsx
<object aria-label={undefined} />;

```

### `7`

```

 lint/a11y/useAltText/reject/8/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <area {...props} />
    ^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `7: formatted`

```jsx
<area {...props} />;

```

### `8`

```

 lint/a11y/useAltText/reject/9/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <area alt={undefined} />
    ^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `8: formatted`

```jsx
<area alt={undefined} />;

```

### `9`

```

 lint/a11y/useAltText/reject/10/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <input type="image" {...props} />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `9: formatted`

```jsx
<input type="image" {...props} />;

```

### `10`

```

 lint/a11y/useAltText/reject/11/file.jsx:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <input type="image" {...props} alt={undefined} />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `10: formatted`

```jsx
<input type="image" {...props} alt={undefined} />;

```

### `11`

```
✔ No known problems!

```

### `11: formatted`

```jsx
<img {...props} alt={true} />;

```

### `12`

```
✔ No known problems!

```

### `12: formatted`

```jsx
<img src="foo" alt="Foo eating a sandwich." />;

```

### `13`

```
✔ No known problems!

```

### `13: formatted`

```jsx
<img src="foo" alt={"Foo eating a sandwich."} />;

```

### `14`

```
✔ No known problems!

```

### `14: formatted`

```jsx
<img src="foo" alt={altText} />;

```

### `15`

```
✔ No known problems!

```

### `15: formatted`

```jsx
<img src="foo" alt={`${person} smiling`} />;

```

### `16`

```
✔ No known problems!

```

### `16: formatted`

```jsx
<img src="foo" alt="" />;

```

### `17`

```
✔ No known problems!

```

### `17: formatted`

```jsx
<object aria-label={true} />;

```

### `18`

```
✔ No known problems!

```

### `18: formatted`

```jsx
<object aria-label="foo" />;

```

### `19`

```
✔ No known problems!

```

### `19: formatted`

```jsx
<object aria-labelledby="id1" />;

```

### `20`

```
✔ No known problems!

```

### `20: formatted`

```jsx
<object>
	Meaningful description
</object>;

```

### `21`

```
✔ No known problems!

```

### `21: formatted`

```jsx
<object>
	{hello}
</object>;

```

### `22`

```
✔ No known problems!

```

### `22: formatted`

```jsx
<object title="An object" />;

```

### `23`

```
✔ No known problems!

```

### `23: formatted`

```jsx
<area {...props} alt={true} />;

```

### `24`

```
✔ No known problems!

```

### `24: formatted`

```jsx
<area aria-label="foo" />;

```

### `25`

```
✔ No known problems!

```

### `25: formatted`

```jsx
<area aria-labelledby="id1" />;

```

### `26`

```
✔ No known problems!

```

### `26: formatted`

```jsx
<area alt="This is descriptive!" />;

```

### `27`

```
✔ No known problems!

```

### `27: formatted`

```jsx
<input type="image" {...props} alt={true} />;

```

### `28`

```
✔ No known problems!

```

### `28: formatted`

```jsx
<input type="image" alt="This is descriptive!" />;

```

### `29`

```
✔ No known problems!

```

### `29: formatted`

```jsx
<input type="image" aria-label="foo" />;

```

### `30`

```
✔ No known problems!

```

### `30: formatted`

```jsx
<input type="image" aria-labelledby="id1" />;

```

### `31`

```

 lint/a11y/useAltText/reject/1/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" />
    ^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `31: formatted`

```html
<img src="foo" />

```

### `32`

```

 lint/a11y/useAltText/reject/2/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img alt />
    ^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `32: formatted`

```html
<img alt />

```

### `33`

```

 lint/a11y/useAltText/reject/3/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" role="presentation" />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `33: formatted`

```html
<img src="foo" role="presentation" />

```

### `34`

```

 lint/a11y/useAltText/reject/4/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <img src="foo" role="none" />
    ^^^^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `34: formatted`

```html
<img src="foo" role="none" />

```

### `35`

```

 lint/a11y/useAltText/reject/5/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <object ></object>
    ^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `35: formatted`

```html
<object>
</object>

```

### `36`

```

 lint/a11y/useAltText/reject/6/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <area  />
    ^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `36: formatted`

```html
<area />

```

### `37`

```

 lint/a11y/useAltText/reject/7/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <area alt />
    ^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `37: formatted`

```html
<area alt />

```

### `38`

```

 lint/a11y/useAltText/reject/8/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <input type="image" />
    ^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `38: formatted`

```html
<input type="image" />

```

### `39`

```

 lint/a11y/useAltText/reject/9/file.html:1 lint/a11y/useAltText ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✖ Provide alt text when using img, area, input type='image', and object elements.

    <input type="image" alt />
    ^^^^^^^^^^^^^^^^^^^^^^^

  ℹ Meaningful alternative text on elements helps users relying on screen readers to understand
    content's purpose within a page.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✖ Found 1 problem

```

### `39: formatted`

```html
<input type="image" alt />

```

### `40`

```
✔ No known problems!

```

### `40: formatted`

```html
<img src="foo" alt="Foo eating a sandwich." />

```

### `41`

```
✔ No known problems!

```

### `41: formatted`

```html
<object aria-label="foo">
</object>

```

### `42`

```
✔ No known problems!

```

### `42: formatted`

```html
<object aria-labelledby="id1">
</object>

```

### `43`

```
✔ No known problems!

```

### `43: formatted`

```html
<object title="An object">
</object>

```

### `44`

```
✔ No known problems!

```

### `44: formatted`

```html
<area aria-label="foo" />

```

### `45`

```
✔ No known problems!

```

### `45: formatted`

```html
<area aria-labelledby="id1" />

```

### `46`

```
✔ No known problems!

```

### `46: formatted`

```html
<area alt="This is descriptive!" />

```

### `47`

```
✔ No known problems!

```

### `47: formatted`

```html
<input type="image" alt="This is descriptive!" />

```

### `48`

```
✔ No known problems!

```

### `48: formatted`

```html
<input type="image" aria-label="foo" />

```

### `49`

```
✔ No known problems!

```

### `49: formatted`

```html
<input type="image" aria-labelledby="id1" />

```