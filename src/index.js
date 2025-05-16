import { AmbientLight, Color, DirectionalLight, Vector3 } from "three";
import { MapControls } from "three/examples/jsm/controls/MapControls.js";

import GeoJSON from "ol/format/GeoJSON.js";
import { tile } from "ol/loadingstrategy.js";
import VectorSource from "ol/source/Vector.js";
import { createXYZ } from "ol/tilegrid.js";

import Instance from "@giro3d/giro3d/core/Instance.js";
import Coordinates from "@giro3d/giro3d/core/geographic/Coordinates.js";
import Extent from "@giro3d/giro3d/core/geographic/Extent.js";
import FeatureCollection from "@giro3d/giro3d/entities/FeatureCollection.js";
import Inspector from "@giro3d/giro3d/gui/Inspector.js";

function bindToggle(id, onChange) {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(
      "invalid binding element: expected HTMLInputElement, got: " +
      element.constructor.name,
    );
  }

  element.oninput = function oninput() {
    onChange(element.checked);
  };

  const initialValue = element.checked;
  const callback = (v) => {
    element.checked = v;
    onChange(element.checked);
  };
  if (element.ownerDocument.readyState === 'complete') {
    onChange(initialValue);
  } else {
    element.ownerDocument.addEventListener('DOMContentLoaded', () => onChange(initialValue));
  }


  return [callback, initialValue, element];
}

Instance.registerCRS(
  "EPSG:3857",
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +type=crs"
);

Instance.registerCRS(
  "urn:ogc:def:crs:OGC:1.3:CRS84",
  "+proj=longlat +datum=WGS84 +no_defs +type=crs"
);

const instance = new Instance({
  target: "view",
  crs: "EPSG:3857",
  backgroundColor: null,
});

const coord1X = 6875349.4002398885786533;
const coord1Y = 4098437.5596272619441152;
const coord2X = 6909500.6937034483999014;
const coord2Y = 4118944.5119603024795651;

const newViewCenterX = (coord1X + coord2X) / 2;
const newViewCenterY = (coord1Y + coord2Y) / 2;

const newExtentWidth = Math.abs(coord2X - coord1X);
const newExtentHeight = Math.abs(coord2Y - coord1Y);

const center = new Coordinates("EPSG:3857", newViewCenterX, newViewCenterY);

const extent = Extent.fromCenterAndSize(
  "EPSG:3857",
  { x: newViewCenterX, y: newViewCenterY },
  newExtentWidth,
  newExtentHeight
);

const buildingSource = new VectorSource({
  format: new GeoJSON(),
  url: "/data.json",
  strategy: tile(createXYZ({ tileSize: 512 })),
});

const colors = {};

function colorFromId(id) {
  if (colors[id] == null) {
    colors[id] = new Color().setHSL(Math.random(), 0.5, 0.5, "srgb");
  }
  return colors[id];
}

const params = {
  shading: true,
  lines: true,
};

const featureCollection = new FeatureCollection({
  source: buildingSource,
  dataProjection: "EPSG:3857",
  extent,
  minLevel: 0,
  maxLevel: 0,
  style: (feature) => {
    console.log("feature", feature)
    return {
      fill: {
        color: colorFromId(feature.get("id") || feature.getId()),
        shading: params.shading,
      },
      stroke: params.lines ? { color: "black", lineWidth: 2 } : null,
    };
  },
});

instance.add(featureCollection);

const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(1000, 1000, 10000);
sun.updateMatrixWorld(true);
instance.scene.add(sun);

const sun2 = new DirectionalLight(0xffffff, 0.5);
sun2.position.set(-1000, -1000, -5000);
sun2.updateMatrixWorld();
instance.scene.add(sun2);

const ambientLight = new AmbientLight(0xffffff, 0.3);
instance.scene.add(ambientLight);

instance.view.camera.position.set(
    center.x + newExtentWidth * 0.1,
    center.y + newExtentHeight * 0.1,
    Math.max(newExtentWidth, newExtentHeight) * 0.8
);

const lookAt = new Vector3(center.x, center.y, 0);
instance.view.camera.lookAt(lookAt);

const controls = new MapControls(instance.view.camera, instance.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;
controls.target.copy(lookAt);
controls.saveState();
instance.view.setControls(controls);

if (document.getElementById('inspector')) {
    Inspector.attach("inspector", instance);
}


if (document.getElementById('toggle-shading')) {
    bindToggle("toggle-shading", (v) => {
      params.shading = v;
      featureCollection.updateStyles();
    });
}

if (document.getElementById('show-lines')) {
    bindToggle("show-lines", (v) => {
      params.lines = v;
      featureCollection.updateStyles();
    });
}

const resultTable = document.getElementById("results");
instance.domElement.addEventListener("mousemove", (e) => {
  resultTable.innerHTML = "";
  const pickResults = instance.pickObjectsAt(e, {
    radius: 5,
    limit: 1,
    pickFeatures: true,
    sortByDistance: true,
  });
  
  const pickedObject = pickResults[0]?.object?.userData?.feature?.values_;
  console.log("pickedObject", pickedObject)
  if (pickedObject) {
    for (const [key, value] of Object.entries(pickedObject)) {
      if (key !== "geometry" && !key.includes("FeatureCollection_ID")) {
        console.log(key, value);
        resultTable.innerHTML += `${key}: ${value}<br>`;
      }
      
    }

    // for (const key in pickedObject) {
    //   console.log(pickedObject)
    //   const layerName = layer.name;
    //   const featureName =
    //     feature.get("nom") ?? feature.get("name") ?? feature.get("gid");
    //   resultTable.innerHTML += `${layerName}: ${featureName}<br>`;
    // }
  }
});