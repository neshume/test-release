import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// ShadowMap + LightMap Res and Number of Directional Lights
const shadowMapRes = 2048;
let camera, scene, renderer, controls, control, control2,
    object = new THREE.Mesh(), lightOrigin = null;//, progressiveSurfacemap;
const dirLights = [], lightmapObjects = [];
const params = { 'Enable': true, 'Blur Edges': true, 'Blend Window': 85,
                    'Light Radius': 50, 'Ambient Weight': 0.2, 'Debug Lightmap': false };
init();
//createGUI();
animate();

function init() {

    // renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    document.body.appendChild( renderer.domElement );

    const light = new THREE.DirectionalLight( 0xffffff,1 );
    light.position.set( 0, -1, 0 ); //default; light shining from top
    
    light.castShadow = true; // default false
    light.shadowDarkness = 0.3;
    

    // camera
    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( 0, 100, 0 );
    camera.name = 'Camera';

    // scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x949494 );
    scene.fog = new THREE.Fog( 0x949494, 1000, 3000 );

    //scene.add( light );

    //Set up shadow properties for the light
    //const dirLight = new THREE.DirectionalLight( 0xffffff, 1.0 / lightCount );
    light.name = 'Dir. Light ';
    light.position.set( 200, 200, 200 );
    light.castShadow = true;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 10000;
    light.shadow.camera.right = 1500;
    light.shadow.camera.left = - 1500;
    light.shadow.camera.top = 1500;
    light.shadow.camera.bottom = - 1500;
    light.shadow.mapSize.width = shadowMapRes;
    light.shadow.mapSize.height = shadowMapRes;

    // progressive lightmap
    //progressiveSurfacemap = new ProgressiveLightMap( renderer, lightMapRes );

    // directional lighting "origin"
    lightOrigin = new THREE.Group();
    lightOrigin.position.set( 60, 150, 100 );
    lightOrigin.add(light);
    scene.add( lightOrigin );

    // transform gizmo
    control = new TransformControls( camera, renderer.domElement );
    control.addEventListener( 'dragging-changed', ( event ) => {

        controls.enabled = ! event.value;

    } );
    control.attach( lightOrigin );
    scene.add( control );

    // ground
    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry( 800, 800 ),
        new THREE.MeshPhongMaterial( { color: 0xffffff, depthWrite: true } )
    );
    groundMesh.position.y = - 0.1;
    groundMesh.rotation.x = - Math.PI / 2;
    groundMesh.name = 'Ground Mesh';
    lightmapObjects.push( groundMesh );
    scene.add( groundMesh );

    groundMesh.receiveShadow = true;

    // model
    function loadModel() {

        object.traverse( function ( child ) {

            if ( child.isMesh ) {

                child.name = 'Loaded Mesh';
                child.castShadow = true;
                child.receiveShadow = true;

            } else {

                child.layers.disableAll(); // Disable Rendering for this

            }

        } );
        scene.add( object );
        object.scale.set( 100, 100, 100 );
        object.position.set( 0, 0, 0 );
        control2 = new TransformControls( camera, renderer.domElement );
        control2.addEventListener( 'dragging-changed', ( event ) => {

            controls.enabled = ! event.value;

        } );
        control2.attach( object );
        scene.add( control2 );
        const lightTarget = new THREE.Group();
        lightTarget.position.set( 0, 20, 0 );
        for ( let l = 0; l < dirLights.length; l ++ ) {

            dirLights[ l ].target = lightTarget;

        }

        object.add( lightTarget );

        if ( typeof TESTING !== 'undefined' ) {

            for ( let i = 0; i < 300; i ++ ) {

                render();

            }

        }

    }


    
    const manager = new THREE.LoadingManager( loadModel );
    const loader = new GLTFLoader( manager );
    loader.load( 'models/DamagedHelmet.glb', function ( obj ) {

        object = obj.scene.children[ 0 ];

    } );

    // controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 100;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 1.5;
    controls.target.set( 0, 100, 0 );
    window.addEventListener( 'resize', onWindowResize );

}

function createGUI() {

    const gui = new GUI( { name: 'Accumulation Settings' } );
    gui.add( params, 'Enable' );
    gui.add( params, 'Blur Edges' );
    gui.add( params, 'Blend Window', 1, 500 ).step( 1 );
    gui.add( params, 'Light Radius', 0, 200 ).step( 10 );
    gui.add( params, 'Ambient Weight', 0, 1 ).step( 0.1 );
    gui.add( params, 'Debug Lightmap' );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );

}

function render() {

    // Update the inertia on the orbit controls
    controls.update();

    // Manually Update the Directional Lights
    for ( let l = 0; l < dirLights.length; l ++ ) {

        // Sometimes they will be sampled from the target direction
        // Sometimes they will be uniformly sampled from the upper hemisphere
        if ( Math.random() > params[ 'Ambient Weight' ] ) {

            dirLights[ l ].position.set(
                lightOrigin.position.x + ( Math.random() * params[ 'Light Radius' ] ),
                lightOrigin.position.y + ( Math.random() * params[ 'Light Radius' ] ),
                lightOrigin.position.z + ( Math.random() * params[ 'Light Radius' ] ) );

        } else {

            // Uniform Hemispherical Surface Distribution for Ambient Occlusion
            const lambda = Math.acos( 2 * Math.random() - 1 ) - ( 3.14159 / 2.0 );
            const phi = 2 * 3.14159 * Math.random();
            dirLights[ l ].position.set(
                        ( ( Math.cos( lambda ) * Math.cos( phi ) ) * 300 ) + object.position.x,
                Math.abs( ( Math.cos( lambda ) * Math.sin( phi ) ) * 300 ) + object.position.y + 20,
                            ( Math.sin( lambda ) * 300 ) + object.position.z
            );

        }

    }

    // Render Scene
    renderer.render( scene, camera );

}

function animate() {

    requestAnimationFrame( animate );
    render();

}