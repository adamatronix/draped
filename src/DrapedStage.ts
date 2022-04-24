import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Ammo from 'ammojs-typed';
import Stats from 'three/examples/jsm/libs/stats.module';
import TestImage from './assets/100000x100000-999-4.png';


interface Origin {
  x: number;
  y: number;
}

interface LooseObject {
  [key: string]: any
}

declare global {
  interface Window {
      Ammo:any;
  }
}


class DrapedStage {
  options: LooseObject;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLDivElement;
  origin: Origin;
  cachedMouse: Origin;
  mouseVector: any;
  texture:string;
  dimensions:any;
  stats:Stats;
  controls: any;
  requestId:number;
  physicsWorld:any;
  clock: THREE.Clock;
  cloth: THREE.Mesh;
  rigidBodies: Array<THREE.Mesh>;
  transformAux1: any;
  pin: THREE.Mesh;
  ammoTmpPos: any;
  ammoTmpQuat: any;
  tmpPos: any;
  tmpQuat: any;
  tmpTrans: any;


  constructor(el: HTMLDivElement, options?: LooseObject) {
    this.container = el;
    this.options = {
      stats: false,
    }
    this.options = { ...this.options, ...options};
    this.stats = this.options.stats ? this.setupStats() : null;
    this.rigidBodies = [];
    this.clock = new THREE.Clock();
    this.tmpPos = new THREE.Vector3();
    this.tmpQuat = new THREE.Quaternion();
  

    Ammo(Ammo).then(() => {
      window.Ammo = Ammo;
      this.tmpTrans = new window.Ammo.btTransform();
      this.ammoTmpPos = new window.Ammo.btVector3();
      this.ammoTmpQuat = new window.Ammo.btQuaternion();
      this.init();
      this.animate();
    })
    
  }

  init = () => {
    
    this.setupEvents();
    this.initGraphics();
    this.initPhysics();
    this.createObjects();
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

  initPhysics = () => {
    const AmmoLib = window.Ammo;
    const gravityConstant = - 9.8;
    // Physics configuration

    const collisionConfiguration = new AmmoLib.btSoftBodyRigidBodyCollisionConfiguration();
    const dispatcher = new AmmoLib.btCollisionDispatcher( collisionConfiguration );
    const broadphase = new AmmoLib.btDbvtBroadphase();
    const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
    const softBodySolver = new AmmoLib.btDefaultSoftBodySolver();
    this.physicsWorld = new AmmoLib.btSoftRigidDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration, softBodySolver );
    this.physicsWorld.setGravity( new AmmoLib.btVector3( 0, gravityConstant, 0 ) );
    this.physicsWorld.getWorldInfo().set_m_gravity( new AmmoLib.btVector3( 0, gravityConstant, 0 ) );

    this.transformAux1 = new AmmoLib.btTransform();

  }

  createObjects = () => {
    const AmmoLib = window.Ammo;

    const posPin = new THREE.Vector3();
    const quatPin = new THREE.Quaternion();
    // Ground
    posPin.set(0, 0.05, 0 );
    quatPin.set( 0, 0, 0, 1 );
    this.pin = this.createParalellepiped( 0.1, 0.1, 0.1, 0, posPin, quatPin, new THREE.MeshPhongMaterial( { color: 0x000000 } ) );

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    // Ground
    pos.set( 0, -0.5, 0 );
    quat.set( 0, 0, 0, 1 );
    const ground = this.createParalellepiped( 40, 1, 40, 0, pos, quat, new THREE.MeshPhongMaterial( { color: 0xFFFFFF } ) );
    ground.castShadow = true;
    ground.receiveShadow = true;

    /**
     * Add Cloth
     */
    const clothWidth = 4;
    const clothHeight = 4;
    const clothNumSegmentsZ = clothWidth * 6;
    const clothNumSegmentsY = clothHeight * 6;
    const clothPos = new THREE.Vector3( 0, -2, 2 );

    const clothGeometry = new THREE.PlaneGeometry( clothWidth, clothHeight, clothNumSegmentsZ, clothNumSegmentsY );
    clothGeometry.rotateY( Math.PI * 0.5);
    clothGeometry.translate( clothPos.x, clothPos.y + clothHeight * 0.5, clothPos.z - clothWidth * 0.5 );

    const clothMaterial = new THREE.MeshPhongMaterial( { color: 0x0083c3, side: THREE.DoubleSide } );
    this.cloth = new THREE.Mesh( clothGeometry, clothMaterial );
    this.cloth.castShadow = true;
    //cloth.receiveShadow = true;
    this.scene.add( this.cloth );

    let manager = new THREE.LoadingManager();
    manager.onLoad = function () {

    }
    /*let TextureLoader = new THREE.TextureLoader(manager);
    TextureLoader.load(TestImage, (texture) => {
      this.cloth.material.map = texture;
      this.cloth.material.needsUpdate = true;
    });*/

    const margin = 0.01;
    // Cloth physic object
    const softBodyHelpers = new AmmoLib.btSoftBodyHelpers();
    const clothCorner00 = new AmmoLib.btVector3( clothPos.x, clothPos.y + clothHeight, clothPos.z );
    const clothCorner01 = new AmmoLib.btVector3( clothPos.x, clothPos.y + clothHeight, clothPos.z - clothWidth );
    const clothCorner10 = new AmmoLib.btVector3( clothPos.x, clothPos.y, clothPos.z );
    const clothCorner11 = new AmmoLib.btVector3( clothPos.x, clothPos.y, clothPos.z - clothWidth );
    const clothSoftBody = softBodyHelpers.CreatePatch( this.physicsWorld.getWorldInfo(), clothCorner00, clothCorner01, clothCorner10, clothCorner11, clothNumSegmentsZ + 1, clothNumSegmentsY + 1, 0, true );
    const sbConfig = clothSoftBody.get_m_cfg();
    sbConfig.set_viterations( 10 );
    sbConfig.set_piterations( 10 );
    clothSoftBody.rotate( new Ammo.btQuaternion( 0, 0, 1, 1 ) );
    clothSoftBody.setTotalMass( 0.9, false );
    AmmoLib.castObject( clothSoftBody, AmmoLib.btCollisionObject ).getCollisionShape().setMargin( margin * 3 );
    this.physicsWorld.addSoftBody( clothSoftBody, 1, - 1 );
    this.cloth.userData.physicsBody = clothSoftBody;
    // Disable deactivation
    clothSoftBody.setActivationState( 4 );



    const influence = 0.01;
    clothSoftBody.appendAnchor( ((clothNumSegmentsZ+1) * clothNumSegmentsY / 2) + ((clothNumSegmentsZ+1)/2), this.pin.userData.physicsBody, false, influence );
  }

  initGraphics = () => {
    this.scene = new THREE.Scene();

    const fov = 45;
    const aspect = this.container.offsetWidth / this.container.offsetHeight;  // the canvas default
    const near = 0.1;
    const far = 500;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0,10, 0);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
		this.camera.updateProjectionMatrix();

    

    const ambient = new THREE.AmbientLight( 0x404040 );
	  this.scene.add( ambient );

    const light = new THREE.PointLight( 0xffffff, 0.7);
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

    //setup controls
    /*this.controls = new OrbitControls( this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 0;
    this.controls.maxDistance = 75;
    this.controls.enablePan = false;
    this.controls.update();*/
  }

  render = () => {
    this.renderer.clear(this.options.trailEffect ? false : true);
    const deltaTime = this.clock.getDelta();
    this.movePin();
		this.updatePhysics( deltaTime );
    this.renderer.render( this.scene, this.camera );
  }

  animate = () => {
    this.requestId = requestAnimationFrame(this.animate);
    this.render();
    this.stats ? this.stats.update() : null;
  }

  updatePhysics = ( deltaTime:any ) => {
    // Step world
    this.physicsWorld.stepSimulation( deltaTime, 10 );

    // Update cloth
    const softBody = this.cloth.userData.physicsBody;
    const clothPositions = this.cloth.geometry.attributes.position.array;
    const numVerts = clothPositions.length / 3;
    const nodes = softBody.get_m_nodes();
    let indexFloat = 0;

    for ( let i = 0; i < numVerts; i ++ ) {

      const node = nodes.at( i );
      const nodePos = node.get_m_x();
      // @ts-ignore
      clothPositions[ indexFloat ++ ] = nodePos.x();
      // @ts-ignore
      clothPositions[ indexFloat ++ ] = nodePos.y();
      // @ts-ignore
      clothPositions[ indexFloat ++ ] = nodePos.z();


    }

    this.cloth.geometry.computeVertexNormals();
    this.cloth.geometry.attributes.position.needsUpdate = true;
    this.cloth.geometry.attributes.normal.needsUpdate = true;

    // Update rigid bodies
    for ( let i = 0, il = this.rigidBodies.length; i < il; i ++ ) {

      const objThree = this.rigidBodies[ i ];
      const objPhys = objThree.userData.physicsBody;
      const ms = objPhys.getMotionState();
      if ( ms ) {

        ms.getWorldTransform( this.transformAux1 );
        const p = this.transformAux1.getOrigin();
        const q = this.transformAux1.getRotation();
        objThree.position.set( p.x(), p.y(), p.z() );
        objThree.quaternion.set( q.x(), q.y(), q.z(), q.w() );

      }

    }
  }

  createParalellepiped = ( sx, sy, sz, mass, pos, quat, material ) => {
    const margin = 0.05;
    const threeObject = new THREE.Mesh( new THREE.BoxGeometry( sx, sy, sz, 1, 1, 1 ), material );
    const shape = new Ammo.btBoxShape( new Ammo.btVector3( sx * 0.5, sy * 0.5, sz * 0.5 ) );
    shape.setMargin( margin );

    this.createRigidBody( threeObject, shape, mass, pos, quat );

    return threeObject;

  }

  createRigidBody = ( threeObject, physicsShape, mass, pos, quat ) => {
    const AmmoLib = window.Ammo;
    threeObject.position.copy( pos );
    threeObject.quaternion.copy( quat );

    const transform = new AmmoLib.btTransform();
    transform.setIdentity();
    transform.setOrigin( new AmmoLib.btVector3( pos.x, pos.y, pos.z ) );
    transform.setRotation( new AmmoLib.btQuaternion( quat.x, quat.y, quat.z, quat.w ) );
    const motionState = new AmmoLib.btDefaultMotionState( transform );

    const localInertia = new AmmoLib.btVector3( 0, 0, 0 );
    physicsShape.calculateLocalInertia( mass, localInertia );

    const rbInfo = new AmmoLib.btRigidBodyConstructionInfo( mass, motionState, physicsShape, localInertia );
    const body = new AmmoLib.btRigidBody( rbInfo );

    threeObject.userData.physicsBody = body;

    this.scene.add( threeObject );

    if ( mass > 0 ) {

      this.rigidBodies.push( threeObject );

      // Disable deactivation
      body.setActivationState( 4 );

    } else {
      body.setCollisionFlags( 2 );
    }

    this.physicsWorld.addRigidBody( body );

  }


  movePin = () => {
    let scalingFactor = 1;
    let translateFactor;

    if(this.mouseVector) {
      translateFactor = this.tmpPos.set( this.mouseVector.x, this.mouseVector.y, this.mouseVector.z);
    } else {
      translateFactor = this.tmpPos.set( 0, 0, 0);
    }
   


    translateFactor.multiplyScalar(scalingFactor);
    this.pin.position.x = translateFactor.x;
    this.pin.position.y = translateFactor.y;
    this.pin.position.z = translateFactor.z;
    this.pin.getWorldPosition(this.tmpPos);
    this.pin.getWorldQuaternion(this.tmpQuat);

    let physicsBody = this.pin.userData.physicsBody;

    let ms = physicsBody.getMotionState();
    if ( ms ) {

        this.ammoTmpPos.setValue(this.tmpPos.x, this.tmpPos.y, this.tmpPos.z);
        this.ammoTmpQuat.setValue( this.tmpQuat.x, this.tmpQuat.y, this.tmpQuat.z, this.tmpQuat.w);


        this.tmpTrans.setIdentity();
        this.tmpTrans.setOrigin( this.ammoTmpPos ); 
        this.tmpTrans.setRotation( this.ammoTmpQuat ); 

        ms.setWorldTransform(this.tmpTrans);

    }

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