const Camera = require('kindred-turntable-camera')
const Render = require('kindred-renderer')
const Geom = require('kindred-geometry')
const Shader = require('kindred-shader')
const Box = require('primitive-cube')
const Node = require('kindred-node')
const Texture2D = require('./')
const scene = Node({
  background: [0.7, 0.8, 1],
  fog: [0.7, 0.8, 1.2]
})

const camera = Node().use(Camera)
const plane = Node().use(Render, {
  geometry: Geom(Box()).attrFaceNormals(),
  shader: Shader`
    #extension ANGLE_instanced_arrays : enable
    precision highp float;

    uniform mat4 uProj;
    uniform mat4 uView;
    uniform mat4 uModel;

    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;

    uniform sampler2D tFace;

    varying vec3 vPos;
    varying vec2 vUV;

    void vert() {
      vUV = uv;
      gl_Position = uProj * uView * uModel * vec4(position, 1);
    }

    void frag() {
      gl_FragColor = texture2D(tFace, vUV);
    }
  `,
  uniforms: function (gl, node, uniforms) {
    uniforms.tFace = texture.bind(gl, 0)
  }
})

var texture = Texture2D.fromImage('red-gem.png')
scene.add(camera, plane)
scene.loop(function (gl) {
  scene.step()
  scene.tick()
  scene.draw(gl, camera)
})
