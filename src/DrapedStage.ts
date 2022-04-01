import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';


interface Origin {
  x: number;
  y: number;
}

interface LooseObject {
  [key: string]: any
}

class DrapedStage {
  options: LooseObject;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sphere: THREE.Mesh;
  renderer: THREE.WebGLRenderer;
  container: HTMLDivElement;
  origin: Origin;
  cachedMouse: Origin;
  mouseVector: any;
  floppy: any;
  texture:string;
  dimensions:any;
  stats:Stats;
  requestId:number;
  punctured:boolean = false;
  intersectionObserver:IntersectionObserver;

  constructor(el: HTMLDivElement, options?: LooseObject) {
    this.container = el;
    this.options = {
      stats: false,
    }
    this.options = { ...this.options, ...options};
    this.stats = this.options.stats ? this.setupStats() : null;
    this.setupEvents();
    this.setupWorld();
    this.addGeometry();
    this.renderFrame();
  }

  setupEvents = () => {
    document.body.addEventListener("mousemove", this.onMouseMove);
  }


  setupStats = () => {
    const stats = Stats();
    stats.setMode(0);

    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0';
    stats.domElement.style.top = '0';
    this.container.appendChild(stats.domElement);

    return stats;
  }

  addGeometry = () => {
    const sphereGeo = new THREE.SphereGeometry(10,50,50);
    const sphereMaterial = new THREE.MeshPhongMaterial( { color: 0xcccccc } );
    const sphere = new THREE.Mesh( sphereGeo, sphereMaterial );

    this.scene.add( sphere );
  }

  setupWorld = () => {
    this.scene = new THREE.Scene();
    const planeGeometry = new THREE.PlaneGeometry( 500, 500 );
    const planeMaterial = new THREE.MeshPhongMaterial( { color: 0xffffff } );
    const ground = new THREE.Mesh( planeGeometry, planeMaterial );

    ground.position.set( 0, 0, 0);
    ground.rotation.x = Math.PI * -.5;

    ground.castShadow = false;
    ground.receiveShadow = true;

    this.scene.add( ground );
    
    

    const fov = 45;
    const aspect = this.container.offsetWidth / this.container.offsetHeight;  // the canvas default
    const near = 0.1;
    const far = 500;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0,40, 0);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
		this.camera.updateProjectionMatrix();

    const ambient = new THREE.AmbientLight( 0xcccccc );
	  this.scene.add( ambient );

    const light = new THREE.PointLight( 0xffffff, 0.2);
    light.castShadow = true;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 3000;
    light.shadow.mapSize.width = 2024;
    light.shadow.mapSize.height = 2024;
    // move the light back and up a bit
    light.position.set( -10, 20, -10 );
    this.scene.add(light);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false});
    this.renderer.setClearColor( 0x000000, 0 );
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.autoClear = this.options.trailEffect ? false : true;
    this.renderer.clear();
    this.renderer.setPixelRatio( window.devicePixelRatio );
    this.renderer.setSize( this.container.offsetWidth, this.container.offsetHeight );
    this.container.appendChild( this.renderer.domElement );
  }

  renderFrame = () => {
    this.requestId = requestAnimationFrame(this.renderFrame);
    this.renderer.clear(this.options.trailEffect ? false : true);

    this.renderer.render( this.scene, this.camera );
    this.stats ? this.stats.update() : null;
  }

  /**
   * On mouse move trigger a tween to the current mouse position.
   * 
   * @param {object} e Mouse event 
   */ 
   onMouseMove = (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    this.cachedMouse = { x:x, y:y };
    this.mouseVector = this.getNormalizedMouseVector(e);
  }

  getNormalizedMouseVector = (e: MouseEvent) => {
    let mouse:LooseObject = {};

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (e.clientY / window.innerHeight) * 2 + 1;

    // Make the sphere follow the mouse
    var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject( this.camera );
    
    var dir = vector.sub( this.camera.position ).normalize();
    var distance = - this.camera.position.y / dir.y;
    return this.camera.position.clone().add( dir.multiplyScalar( distance ) );
  }

  destroyEvents = () => {
    document.body.removeEventListener("mousemove", this.onMouseMove);
  }

  destroy = () => {
    this.destroyEvents();
    cancelAnimationFrame(this.requestId);
    this.requestId = undefined;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.container.innerHTML = '';
  }

}

export default DrapedStage;