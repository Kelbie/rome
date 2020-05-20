./scripts/build-release dist
echo "module.exports = $(cat dist/index.js)" > dist/index.js
sed -ie 's/\([0-9]\)_\([0-9]\)/\1\2/g' dist/index.js
browserify dist/index.js --standalone Rome | derequire > rome.js
