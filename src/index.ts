import * as THREE from "three";
import { Object3D, PerspectiveCamera, Scene, WebGLRenderer } from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

let camera: PerspectiveCamera,
  scene: Scene,
  renderer: WebGLRenderer,
  controls: OrbitControls;
let mouse = {
    x: 0,
    y: 0,
  },
  INTERSECTED: any;
init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  camera = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    0.25,
    20
  );
  camera.position.set(0, 0.6, 2.7);

  scene = new THREE.Scene();
  const loader = new GLTFLoader().setPath("assets/pc/source/");
  loader.load("computer.glb", function (gltf) {
    scene.add(gltf.scene);
  });

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 10;
  controls.target.set(0, 0.5, -0.2);
  controls.update();

  window.addEventListener("resize", onWindowResize);
  document.addEventListener("mousemove", onDocumentMouseMove, false);
}

function onDocumentMouseMove(event: MouseEvent) {
  // the following line would stop any other event handler from firing
  // (such as the mouse's TrackballControls)
  // event.preventDefault();

  // update the mouse variable
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  update();
}

//

function animate() {
  requestAnimationFrame(animate);
  render();
  update();
}

function update() {
  // find intersections

  // create a Ray with origin at the mouse position
  //   and direction into the scene (camera direction)
  var vector = new THREE.Vector3(mouse.x, mouse.y, 1);
  vector.unproject(camera);
  var ray = new THREE.Raycaster(
    camera.position,
    vector.sub(camera.position).normalize()
  );

  // create an array containing all objects in the scene with which the ray intersects
  var intersects = ray.intersectObjects(scene.children);
  // INTERSECTED = the object in the scene currently closest to the camera
  //		and intersected by the Ray projected from the mouse position

  // if there is one (or more) intersections
  if (intersects.length > 0) {
    // if the closest object intersected is not the currently stored intersection object
    if (intersects[0].object != INTERSECTED) {
      // restore previous intersection object (if it exists) to its original color
      if (INTERSECTED) {
        INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
        console.log(INTERSECTED);
      }
      // store reference to closest object as current intersection object
      INTERSECTED = intersects[0].object;
      // store color of closest object (for later restoration)
      INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
      // set a new color for closest object
      INTERSECTED.material.color.setHex(0xffff00);
    }
  } // there are no intersections
  else {
    // restore previous intersection object (if it exists) to its original color
    if (INTERSECTED) INTERSECTED.material.color.setHex(INTERSECTED.currentHex);
    // remove previous intersection object reference
    //     by setting current intersection object to "nothing"
    INTERSECTED = null;
  }
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}
