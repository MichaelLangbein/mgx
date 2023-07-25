import "./style.css";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import WebGLTileLayer, { Options } from "ol/layer/WebGLTile";
import OSM from "ol/source/OSM";
import GeoTIFF, { SourceInfo } from "ol/source/GeoTIFF";
import WebGLTileLayerRenderer from "ol/renderer/webgl/TileLayer";
import GeoTIFFSource from "ol/source/GeoTIFF";

const cogUrlB5 = "https://landsatlook.usgs…25_20230725_02_T2_B5.TIF";
const cogUrlB8 = "https://landsatlook.usgs…25_20230725_02_T2_B8.TIF";

const target = document.getElementById('app') as HTMLDivElement;


const osmBase = new TileLayer({
  source: new OSM(),
  className: 'gray'
});






class CustomWebGLTileLayer extends WebGLTileLayer {

  private vertexShader = `
  attribute vec2 a_textureCoord;
  uniform mat4 u_tileTransform;
  uniform float u_texturePixelWidth;
  uniform float u_texturePixelHeight;
  uniform float u_textureResolution;
  uniform float u_textureOriginX;
  uniform float u_textureOriginY;
  uniform float u_depth;

  varying vec2 v_textureCoord;
  varying vec2 v_mapCoord;

  void main() {
    v_textureCoord = a_textureCoord;
    v_mapCoord = vec2(
      u_textureOriginX + u_textureResolution * u_texturePixelWidth * v_textureCoord[0],
      u_textureOriginY - u_textureResolution * u_texturePixelHeight * v_textureCoord[1]
    );
    gl_Position = u_tileTransform * vec4(a_textureCoord, u_depth, 1.0);
  }
`;

  private fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec2 v_textureCoord;
  varying vec2 v_mapCoord;
  uniform vec4 u_renderExtent;
  uniform float u_transitionAlpha;
  uniform float u_texturePixelWidth;
  uniform float u_texturePixelHeight;
  uniform float u_resolution;
  uniform float u_zoom;

  uniform sampler2D u_tileTextures[1];
 
  float 
getBandValue(float band, float xOffset, float yOffset) {
      float dx = xOffset / u_texturePixelWidth;
      float dy = yOffset / u_texturePixelHeight;
      if (band == 1.0) {
        return texture2D(u_tileTextures[0], v_textureCoord + vec2(dx, dy))[0];
      }
      if (band == 2.0) {
        return texture2D(u_tileTextures[0], v_textureCoord + vec2(dx, dy))[1];
      }
      if (band == 3.0) {
        return texture2D(u_tileTextures[0], v_textureCoord + vec2(dx, dy))[2];
      }
      if (band == 4.0) {
        return texture2D(u_tileTextures[0], v_textureCoord + vec2(dx, dy))[3];
      }
  }
    

  void main() {
    if (
      v_mapCoord[0] < u_renderExtent[0] ||
      v_mapCoord[1] < u_renderExtent[1] ||
      v_mapCoord[0] > u_renderExtent[2] ||
      v_mapCoord[1] > u_renderExtent[3]
    ) {
      discard;
    }

    vec4 color = texture2D(u_tileTextures[0],  v_textureCoord);

    color = (
      getBandValue(4.0, 0.0, 0.0) * vec4((255.0 * abs((((
      getBandValue(2.0, 0.0, 0.0) - 
      getBandValue(1.0, 0.0, 0.0)) / (
      getBandValue(2.0, 0.0, 0.0) + 
      getBandValue(1.0, 0.0, 0.0))) - ((
      getBandValue(3.0, 0.0, 0.0) - 
      getBandValue(1.0, 0.0, 0.0)) / (
      getBandValue(3.0, 0.0, 0.0) + 
      getBandValue(1.0, 0.0, 0.0)))))) / 255.0, (255.0 * ((
      getBandValue(2.0, 0.0, 0.0) - 
      getBandValue(1.0, 0.0, 0.0)) / (
      getBandValue(2.0, 0.0, 0.0) + 
      getBandValue(1.0, 0.0, 0.0)))) / 255.0, (255.0 * ((
      getBandValue(3.0, 0.0, 0.0) - 
      getBandValue(1.0, 0.0, 0.0)) / (
      getBandValue(3.0, 0.0, 0.0) + 
      getBandValue(1.0, 0.0, 0.0)))) / 255.0, 1.0));

    if (color.a == 0.0) {
      discard;
    }

    gl_FragColor = color;
    gl_FragColor.rgb *= gl_FragColor.a;
    gl_FragColor *= u_transitionAlpha;
  }
`;

  createRenderer() {
    return new WebGLTileLayerRenderer(this, {
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
      uniforms: {},
      cacheSize: undefined
    });
  }
}


const thermalLayer = new CustomWebGLTileLayer({
  source: new GeoTIFF({
    sources: [
      {
        url: 'https://s2downloads.eox.at/demo/Sentinel-2/3857/R10m.tif',
        bands: [3, 4],
        min: 0,
        nodata: 0,
        max: 65535,
      },
      {
        url: 'https://s2downloads.eox.at/demo/Sentinel-2/3857/R60m.tif',
        bands: [9],
        min: 0,
        nodata: 0,
        max: 65535,
      },
    ],
  }),
});


function createStandardShaders(source: GeoTIFF) {
  const layer = new WebGLTileLayer({
    style: {
      color: ['array', ['band', 1], ['band', 2], ['band', 3], 1],
      gamma: 1.1,
    },
    source: source,
  });
  const renderer = layer.getRenderer();
  // @ts-ignore
  return {vertex: renderer.vertexShader_, fragment: renderer.fragmentShader_};
}
// const source = thermalLayer.getSource() as GeoTIFFSource;
// const {vertex, fragment} = createStandardShaders(source);
// console.log(vertex, fragment);

const layers = [osmBase, thermalLayer];

const view = thermalLayer.getSource()!.getView();

const map = new Map({layers, view, target});