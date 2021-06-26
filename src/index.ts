import * as THREE from "three";
import {
  BoxGeometry,
  Camera,
  Mesh,
  MeshNormalMaterial,
  Renderer,
  Scene,
  WebGLRenderer,
} from "three";

let camera: Camera, scene: Scene, renderer: WebGLRenderer;

init();

function init() {
  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.z = 1;

  scene = new THREE.Scene();

  let geometry1 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  let geometry2 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  let geometry3 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshNormalMaterial();

  let mesh1 = new THREE.Mesh(geometry1, material);
  let mesh2 = new THREE.Mesh(geometry2, material);
  let mesh3 = new THREE.Mesh(geometry3, material);

  scene.add(mesh1);
  scene.add(mesh2);
  scene.add(mesh3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop((time) => {
    animation(time, mesh1);
    animation(time, mesh2);
    animation(time, mesh3);
  });

  document.body.appendChild(renderer.domElement);
}

function animation(time: number, mesh: Mesh) {
  //mesh.rotation.x = time / 2000;
  mesh.rotation.y = time / 1000;

  renderer.render(scene, camera);
}
