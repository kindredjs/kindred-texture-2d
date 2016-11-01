var loadImage = require('image-loaded')
var GL_UNSIGNED_BYTE = 5121
var GL_RGBA = 6048
var GL_NEAREST = 9728
var GL_CLAMP_TO_EDGE = 33071
var bogusData = new Uint8Array(4)

module.exports = Texture2D

function Texture2D () {
  if (!(this instanceof Texture2D)) {
    return new Texture2D()
  }

  this.gl = null
  this.texture = null
  this.hasContent = false
  this.type = GL_UNSIGNED_BYTE
  this.shape = new Float32Array(3)
  this.format = GL_RGBA
  this.minFilter = GL_NEAREST
  this.magFilter = GL_NEAREST
  this.wrap = [GL_CLAMP_TO_EDGE, GL_CLAMP_TO_EDGE]
  this._loadedWith = null
  this.isLoaded = true
}

Texture2D.prototype.bind = function (gl, location) {
  gl = gl || this.gl
  location = location || 0

  if (gl && this.gl && this.gl !== gl) throw new Error('Textures are currently only supported for a single WebGL context')
  if (!this.texture) {
    this.gl = gl
    this.texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0 + location)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, bogusData)
  } else {
    gl.activeTexture(gl.TEXTURE0 + location)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
  }

  if (this._loadedWith !== null) {
    this.uploadElement(this._loadedWith)
    this.setFilters(this.minFilter, this.magFilter)
    this.setWrapping(this.wrap[0], this.wrap[1])
    this._loadedWith = null
  }
}

Texture2D.prototype.init = function (shape, DataType) {
  var size = 1

  size *= shape[0]
  size *= shape[1]
  size *= shape.length > 2 ? shape[2] : 4
  DataType = DataType || Uint8Array

  this.uploadData(new DataType(size), shape)
  this.setFilters(this.minFilter, this.magFilter)
  this.setWrapping(this.wrap[0], this.wrap[1])

  return this
}

Texture2D.prototype.setFilters = function (min, mag) {
  if (!min && !mag) return this
  if (arguments.length === 1) return this.setFilters(min, min)

  var gl = this.gl
  if (min) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min)
  if (mag) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag)
  this.minFilter = min
  this.magFilter = mag
  return this
}

Texture2D.prototype.setWrapping = function (x, y) {
  if (!x && !y) return this
  if (arguments.length === 1) return this.setWrapping(x, x)

  var gl = this.gl
  if (x) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, x)
  if (y) gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, y)
  this.wrap[0] = x
  this.wrap[1] = y
  return this
}

var floatExt = null

Texture2D.prototype.uploadData = function (data, shape) {
  var gl = this.gl

  this.bind()
  this.shape[0] = shape[0]
  this.shape[1] = shape[1]
  this.shape[2] = shape.length > 2 ? shape[2] : 4
  this.format = getFormat(gl, this.shape[2])

  if (Array.isArray(data)) {
    data = new Uint8Array(data)
  }

  if (data instanceof Float32Array) {
    floatExt = floatExt || gl.getExtension('OES_TEXTURE_FLOAT')
    this.type = gl.FLOAT

    if (!floatExt) {
      throw new Error('Floating point textures are not available on this device')
    }
  } else {
    this.type = gl.UNSIGNED_BYTE
  }

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, this.shape[2])
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    this.format,
    this.shape[0],
    this.shape[1],
    0, // border
    this.format,
    this.type,
    data
  )

  return this
}

Texture2D.prototype.uploadElement = function (el) {
  var gl = this.gl
  this.shape[0] = el.naturalWidth || el.width
  this.shape[1] = el.naturalHeight || el.height
  this.shape[2] = 4
  this.format = getFormat(gl, this.shape[2])

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, this.shape[2])
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, el)
}

Texture2D.prototype.insertData = function (data, coord, shape) {
  var gl = this.gl

  if (Array.isArray(data)) {
    data = this.type === gl.FLOAT
      ? new Float32Array(data)
      : new Uint8Array(data)
  }

  var expectedLength = shape[0] * shape[1] * this.shape[2]
  if (expectedLength !== data.length) {
    throw new Error(
      'Your data should be ' + expectedLength + ' elements long, but is currently ' + data.length
    )
  }

  this.bind()
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, this.shape[2])
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0, // mip level
    coord[0],
    coord[1],
    shape[0],
    shape[1],
    this.format,
    this.type,
    data
  )

  return this
}

function getFormat (gl, channels) {
  switch (channels) {
    case 1: return gl.LUMINANCE
    case 2: return gl.LUMINANCE_ALPHA
    case 4: return gl.RGBA
  }

  throw new Error(
    'Invalid pixel format: textures must have 1, 2 or 4 channels, not ' + channels
  )
}

Texture2D.fromImage = function (img) {
  if (typeof img === 'string') {
    var src = img
    img = document.createElement('img')
    img.src = src
  }

  var texture = Texture2D()

  texture.isLoaded = false
  loadImage(img, function (err) {
    if (err) throw err
    texture.isLoaded = true
    texture._loadedWith = img
  })

  return texture
}
