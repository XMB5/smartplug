/////////////////////////////////////////////////////////////////////////////
/** @file
generate C++ source of embedded compiled assets

\copyright Copyright (c) 2018 Chris Byrne. All rights reserved.
Licensed under the MIT License. Refer to LICENSE file in the project root. */
/////////////////////////////////////////////////////////////////////////////

const mime = require('mime-types')
const path = require('path')
const zlib = require('zlib')

/////////////////////////////////////////////////////////////////////////////
/// escape a quoted C string (\'s and "'s)
function escapeCString(s) {
  return s.replace(/\\"/g, '\\$&')
}

/////////////////////////////////////////////////////////////////////////////
function GenerateSourcePlugin(options) { }

GenerateSourcePlugin.prototype.apply = function(compiler) {
  compiler.plugin('emit', function(compilation, callback) {
    const assets = []
    Object.keys(compilation.assets).forEach((name) => {
      const asset = compilation.assets[name]
      const escapedName = escapeCString(name)

      // sanitize variable name
      let varName = path.basename(name).replace(/[^A-Za-z0-9]/g, '_')
      varName = `asset${assets.length}__${varName}`

      // convert asset source to a C byte array
      const source = zlib.gzipSync(
        Buffer.from(asset.source()),
        {
          level: 9 // best compression
        }
      )

      let arrayData = ""
      for (let i = 0, len = source.length; i < len; ++i) {
        arrayData += `${source[i].toString()},`
      }

      assets.push({
        path: name,
        mimeType: escapeCString(mime.lookup(name) || ''),
        varName,
        escapedName,
        arrayData,
        length: source.length,
      })
    })

    // sort assets by path
    assets.sort((lhs, rhs) => lhs.path.localeCompare(rhs.path))

    // our source file contents
    const webAssetsHeader = `// This file was autogenerated by generate-source-plugin.js

// includes
#include <cstddef>
#include <cstdint>
#include "WString.h"

/// compiled web asset
struct WebAsset {
  String          path;     ///< URL path (/index.html)
  const char*     mimeType; ///< associated mime type
  size_t          length;   ///< data length (in bytes)
  const uint8_t*  data;     ///< asset data
};

/// path comparison
struct WebAssetPathCompare {
    bool operator()(const String& lhs, const WebAsset& rhs) {
        return lhs < rhs.path;
    }
    bool operator()(const WebAsset& lhs, const String& rhs) {
        return lhs.path < rhs;
    }
};

extern const WebAsset webAssets[];  ///< array of compiled assets
extern const size_t webAssetsCount; ///< entries in array
`;

    const webAssetsSource = `// This file was autogenerated by generate-source-plugin.js

// includes
#include "web_assets.h"

// embedded asset data
${assets.map((a) =>
`static ICACHE_RODATA_ATTR const uint8_t ${a.varName}[] = {${a.arrayData}};`
).join('\r\n')}

// list of compiled assets
const WebAsset webAssets[] = {
${assets.map((a) =>
`  {"/${a.escapedName}", "${a.mimeType}", ${a.length}, ${a.varName}},`
).join('\r\n')}
};
const size_t webAssetsCount = ${assets.length};
`

    // Insert this list into the Webpack build as a new file asset:
    compilation.assets['web_assets.cpp'] = {
      source() { return webAssetsSource },
      size() { return webAssetsSource.length }
    }
    compilation.assets['web_assets.h'] = {
      source() { return webAssetsHeader },
      size() { return webAssetsHeader.length }
    }

    callback()
  })
}

module.exports = GenerateSourcePlugin
