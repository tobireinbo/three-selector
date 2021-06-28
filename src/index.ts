import * as THREE from "three";
import {
  Euler,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
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
let model1: { object: Object3D; spin: boolean; tween: void };
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
  scene.add(new THREE.AmbientLight(0xaaaaaa, 0.5));
  scene.fog = new THREE.Fog("#000000", 2, 4);

  /*
   *
   * load glb model
   *
   */
  const loader = new GLTFLoader().setPath("assets/pc/source/");
  loader.load("computer.glb", function (gltf) {
    scene.add(gltf.scene);
    model1 = {
      object: gltf.scene,
      spin: true,
      tween: undefined,
    };
  });

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
    greyscale: true,
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
      console.log("in");

      model1.tween = new TWEEN.Tween({
        posZ: model1.object.position.z,
        rotY: model1.object.rotation.y,
      })
        .to({ posZ: 0.5, rotY: 0 }, 500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (obj: { posZ: number; rotY: number }) {
          model1.object.position.z = obj.posZ;
          model1.object.rotation.y = obj.rotY;
        })
        .start();

      intersectedObject = object.parent;
      model1.spin = false;
      outlinePass.selectedObjects = [intersectedObject];
    }
  } else {
    if (intersectedObject) {
      console.log("out");

      model1.tween = new TWEEN.Tween(model1.object.position)
        .to({ z: 0 }, 500)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (pos: { x: number; y: number; z: number }) {
          model1.object.position.z = pos.z;
        })
        .start();

      intersectedObject = undefined;
      model1.spin = true;
      outlinePass.selectedObjects = [];
    }
  }
}

//

function animate() {
  requestAnimationFrame(animate);
  const timer = performance.now();
  if (model1.spin) {
    if (model1.object.rotation.y >= 2 * Math.PI) {
      model1.object.rotation.y = 0;
    }
    model1.object.rotation.y += 0.005;
  }
  TWEEN.update(timer);
  composer.render();
}
