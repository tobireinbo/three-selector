import * as THREE from "three";
import {
  Euler,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader";
import { HalftonePass } from "three/examples/jsm/postprocessing/HalftonePass";

const TWEEN = require("@tweenjs/tween.js");
let camera: PerspectiveCamera,
  scene: Scene,
  renderer: WebGLRenderer,
  controls: OrbitControls,
  composer: EffectComposer,
  outlinePass: OutlinePass,
  effectFXAA: ShaderPass;
let mouse: Vector2, raycaster: Raycaster;
let intersectedObject: Object3D;
let models: Array<Model> = [];
type Model = {
  object: Object3D;
  spin: boolean;
  tween: void;
  idleRotation: number;
  idlePosition: { x: number; y: number; z: number };
};

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  /*
   *
   * camera
   *
   */
  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(0, 0.6, 2.7);

  /*
   *
   * scene
   *
   */
  scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xaaaaaa, 3));
  scene.fog = new THREE.Fog("#000000", 2, 4);

  /*
   *
   * load glb model
   *
   */

  [
    {
      dir: "assets/personal_computer/",
      file: "scene.gltf",
      scale: 0.2,
      rotation: 0,
      offset: {
        x: 0,
        y: -2.5,
        z: 2,
      },
    },
    {
      dir: "assets/1982_sony_betacam/",
      file: "scene.gltf",
      scale: 0.05,
      rotation: Math.PI / 2,
      offset: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
  ].forEach(
    (
      path: {
        dir: string;
        file: string;
        scale: number;
        rotation: number;
        offset: { x: number; y: number; z: number };
      },
      index: number
    ) => {
      const loader = new GLTFLoader().setPath(path.dir);
      loader.load(path.file, function (gltf) {
        gltf.scene.scale.set(path.scale, path.scale, path.scale);
        gltf.scene.position.set(
          path.offset.x + index * 1.5,
          path.offset.y,
          path.offset.z
        );
        gltf.scene.rotation.y += path.rotation;
        scene.add(gltf.scene);
        models.push({
          object: gltf.scene,
          spin: true,
          tween: undefined,
          idleRotation: path.rotation,
          idlePosition: path.offset,
        });
      });
    }
  );

  /*
   *
   * raycaster & mouse for intersection
   *
   */
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  /*
   *
   * renderer
   *
   */
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  /*controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0.5, -0.2);
  controls.update();
*/

  /*
   *
   * render pass
   *
   */
  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  /*
   *
   * outlines
   *
   */
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.visibleEdgeColor.set("#ffffff");
  outlinePass.hiddenEdgeColor.set("#190a05");
  outlinePass.pulsePeriod = 0;
  outlinePass.usePatternTexture = false;
  outlinePass.edgeStrength = 3.0;
  outlinePass.edgeGlow = 0.0;
  outlinePass.edgeThickness = 1.0;
  composer.addPass(outlinePass);

  /*
   *
   * FXAA
   *
   */
  effectFXAA = new ShaderPass(FXAAShader);
  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
  composer.addPass(effectFXAA);

  /*
   *
   * halftones
   *
   */
  const params = {
    shape: 1,
    radius: 4,
    rotateR: Math.PI / 12,
    rotateB: (Math.PI / 12) * 2,
    rotateG: (Math.PI / 12) * 3,
    scatter: 0,
    blending: 1,
    blendingMode: 1,
    greyscale: false,
    disable: false,
  };
  const halftonePass = new HalftonePass(
    window.innerWidth,
    window.innerHeight,
    params
  );
  //composer.addPass(halftonePass);

  /*
   *
   * event listener
   *
   */
  window.addEventListener("resize", onWindowResize);
  renderer.domElement.addEventListener("mousemove", onClick, false);
}

function onWindowResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);

  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
}

function onClick(event: MouseEvent) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObject(scene, true);

  if (intersects.length > 0) {
    var object: Object3D = intersects[0].object;
    if (!intersectedObject) {
      let foundObject: Object3D = null;
      models.forEach((m) => {
        const upper = getParentById(object, m.object.uuid);
        if (upper) {
          foundObject = upper;
        }
      });

      const currentModel = models.find(
        (m) => m.object.uuid === foundObject.uuid
      );

      if (currentModel) {
        currentModel.tween = new TWEEN.Tween({
          posZ: currentModel.object.position.z,
          rotY: currentModel.object.rotation.y,
        })
          .to(
            {
              posZ: currentModel.idlePosition.z + 0.5,
              rotY: currentModel.idleRotation,
            },
            500
          )
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(function (obj: { posZ: number; rotY: number }) {
            currentModel.object.position.z = obj.posZ;
            currentModel.object.rotation.y = obj.rotY;
          })
          .start();
        currentModel.spin = false;
      }

      intersectedObject = object.parent;

      outlinePass.selectedObjects = [intersectedObject];
    }
  } else {
    if (intersectedObject) {
      let foundObject: Object3D = null;
      models.forEach((m) => {
        const upper = getParentById(intersectedObject, m.object.uuid);
        if (upper) {
          foundObject = upper;
        }
      });

      const currentModel = models.find(
        (m) => m.object.uuid === foundObject.uuid
      );

      if (currentModel) {
        currentModel.tween = new TWEEN.Tween(currentModel.object.position)
          .to({ z: currentModel.idlePosition.z }, 500)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate(function (pos: { x: number; y: number; z: number }) {
            currentModel.object.position.z = pos.z;
          })
          .start();
        currentModel.spin = true;
      }
      intersectedObject = undefined;

      outlinePass.selectedObjects = [];
    }
  }
}

//

function animate() {
  requestAnimationFrame(animate);
  const timer = performance.now();
  models.forEach((model: Model) => {
    if (model.spin) {
      if (model.object.rotation.y >= 2 * Math.PI) {
        model.object.rotation.y = 0;
      }
      model.object.rotation.y += 0.005;
    }
  });

  TWEEN.update(timer);
  composer.render();
}

function getParentById(object: Object3D, id: string): any {
  if (object.uuid !== id) {
    if (object.parent) {
      return getParentById(object.parent, id);
    } else {
      return null;
    }
  } else {
    return object;
  }
}
