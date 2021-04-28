// Identify canvas element to script.
const canvas = document.getElementById('render-canvas');

// Initialize Babylon.js variables.
let engine, scene, sceneToRender;
const createDefaultEngine = function () {
    return new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
    });
};

// Create scene and create XR experience.
const createScene = async function () {
    // Create a basic Babylon XR scene
    let scene = new BABYLON.Scene(engine);
    let camera = new BABYLON.FreeCamera('camera-1', new BABYLON.Vector3(0, 1.4, -1.2), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.4, 0));
    camera.attachControl(canvas, true);

    let light = new BABYLON.SpotLight(
        'spotLight',
        new BABYLON.Vector3(0, 1.5, -0.3),
        new BABYLON.Vector3(0, -1, 0),
        Math.PI / 1.3,
        2,
        scene
    );
    light.intensity = 3;

    scene.clearColor = new BABYLON.Color3(0.0, 0.0, 0.0);

    var pitchAntennaPosition = new BABYLON.Vector3();
    var volumeAntennaPosition = new BABYLON.Vector3();

    BABYLON.SceneLoader.ImportMesh('', '', 'THEREMIN.babylon', scene, function () {
        // Get location of antennae
        pitchAntennaPosition = scene.getMeshByName('PitchAntenna').position;
        volumeAntennaPosition = scene.getMeshByName('VolumeAntenna').position;
    });

    //------- FILM CLIP ON PLANE -------
    var videoPlane = BABYLON.MeshBuilder.CreatePlane('plane', { width: 5, height: 3.5 }, scene);
    videoPlane.position = new BABYLON.Vector3(0, 1, 3);

    var videoMaterial = new BABYLON.StandardMaterial('texture1', scene);

    var videoTexture = new BABYLON.VideoTexture('video', './data/video/farmersspring.mp4', scene, true);
    videoTexture.video.muted = true;
    videoMaterial.diffuseTexture = videoTexture;
    videoMaterial.emissiveColor = new BABYLON.Color3.White();
    videoPlane.material = videoMaterial;

    videoTexture.video.play();

    // ------- WEBCAM VIDEO + ML POSE RECOGNITION -------

    let poses = [];
    let poseNet;

    // based on https://github.com/AnnaKap/facefun/blob/master/index.html
    let video = document.createElement('video');
    let vidDiv = document.getElementById('video');
    video.setAttribute('width', 255);
    video.setAttribute('height', 255);
    video.autoplay = true;
    vidDiv.appendChild(video);

    // get the users webcam stream to render in the video
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then(function (stream) {
            video.srcObject = stream;
        })
        .catch(function (err) {
            console.log('An error occurred! ' + err);
        });

    let options = {
        flipHorizontal: true,
        minConfidence: 0.7,
    };

    // ---------- Audio Context ------------------//

    //create audio context for all theremin voices
    ctx = new (AudioContext || webkitAudioContext)();
    ctx.suspend();

    //initialize audio context for grainsynth

    init(ctx);
    grainSample = 0; // 0 = synthetic sound, 2 = guitar sound, 3 = piano with echo sound
    bufferSwitch(grainSample);
    grainPlaying = false;

    // initialize default theremin sound
    oscillator = null;
    gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    var soundPlaying = false;

    // Calculate frequency relative to PitchAntenna
    var calculateFrequency = function (distance) {
        var minFrequency = 131; // C3
        maxFrequency = 494; // B4

        var pitchSensitivity = 10;

        return Math.exp(-distance * pitchSensitivity) * (maxFrequency - minFrequency) + minFrequency;
    };

    var calculateGain = function (distance) {
        var minGain = 0;
        maxGain = 1;

        var gainSensitivity = 1;

        return Math.exp(-distance * gainSensitivity) * (maxGain - minGain) + minGain;
    };

    var setFrequency = () => {
        //pitchDistance = BABYLON.Vector3.DistanceSquared(sphereRight.position, pitchAntennaPosition);
        pitchDistance = BABYLON.Vector3.DistanceSquared(new BABYLON.Vector3(rightPosX, rightPosY, 0), pitchAntennaPosition);
        oscillator.frequency.setTargetAtTime(calculateFrequency(pitchDistance), ctx.currentTime, 0.01);
    };

    var setGain = () => {
        //var volumeDistance = BABYLON.Vector3.DistanceSquared(sphereLeft.position, volumeAntennaPosition);
        var volumeDistance = BABYLON.Vector3.DistanceSquared(new BABYLON.Vector3(leftPosX, leftPosY, 0), volumeAntennaPosition);
        gainNode.gain.setTargetAtTime(1 - calculateGain(volumeDistance), ctx.currentTime, 0.01);
    };

    // ---------- Position Tracking ------------------//

    poseNet = ml5.poseNet(video, options, modelReady);

    function modelReady() {
        console.log('model Loaded');
    }
    // ------- PARTICLES -------
    let particleSystem = [];
    let colorright = new BABYLON.Color4(1.0, 0.65, 0, 1.0);
    let colorleft = new BABYLON.Color4(1.0, 0.2, 0, 1.0);

    createParticles(colorright, 0);
    createParticles(colorleft, 1);

    function createParticles(color, i) {
        particleSystem[i] = new BABYLON.ParticleSystem('particles', 1500, scene);
        particleSystem[i].particleTexture = new BABYLON.Texture('https://www.babylonjs.com/assets/Flare.png', scene);
        particleSystem[i].minEmitBox = new BABYLON.Vector3(-0.01, 0, -0.01); // minimum box dimensions
        particleSystem[i].emitter = new BABYLON.Vector3(0, 1, -0.03); // the point at the top of the fountain
        particleSystem[i].maxEmitBox = new BABYLON.Vector3(0.01, 0, 0.01); // maximum box dimensions
        particleSystem[i].color1 = color;
        particleSystem[i].blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
        particleSystem[i].minSize = 0.005;
        particleSystem[i].maxSize = 0.03;
        particleSystem[i].minLifeTime = 0.1;
        particleSystem[i].maxLifeTime = 0.2;
        particleSystem[i].emitRate = 300;
        particleSystem[i].direction1 = new BABYLON.Vector3(1, 1, 2);
        particleSystem[i].direction2 = new BABYLON.Vector3(-1, -1, -2);
        particleSystem[i].minEmitPower = 0.1;
        particleSystem[i].maxEmitPower = 0.4;
        particleSystem[i].updateSpeed = 0.002;
        particleSystem[i].start();
    }

    // particles position - hand tracking
    poseNet.on('pose', function (results) {
        if (results.length > 0) {
            poses = results[0].pose;

            rightPosX = map(poses.rightWrist.x, 100, 255, 0.05, 0.8);
            rightPosY = map(poses.rightWrist.y, 255, 0, 1, 1.8);
            leftPosX = map(poses.leftWrist.x, 100, 255, -0.25, -0.1);
            leftPosY = map(poses.leftWrist.y, 255, 0, 1, 1.8);

            particleSystem[0].emitter.x = rightPosX;
            particleSystem[0].emitter.y = rightPosY;
            particleSystem[1].emitter.x = leftPosX;
            particleSystem[1].emitter.y = leftPosY;

            posY = map(poses.leftWrist.y, 0, video.height, 0, window.innerHeight);
            posX = map(poses.rightWrist.x, 0, video.width, 0, window.innerWidth);
            grains(posX, posY);

            if (soundPlaying) {
                setFrequency();
                setGain();
            }
        }
    });

    // GUI for grain params
    // Documentation: https://cocopon.github.io/tweakpane/input.html

    const PARAMS = {
        source: 0,
        attack: 0.3,
        decay: 0.3,
        density: 35,
    };

    const pane = new Tweakpane({
        title: 'VIRTUAL THEREMIN SOUNDS',
        expanded: true,
    });

    pane.addSeparator();

    const gs = pane.addFolder({
        title: 'THEREMIN GRANULAR SYNTHESIS',
        expanded: true,
    });

    const btn = gs.addButton({
        title: '► | ◼︎',
        label: 'sound',
    });

    btn.on('click', () => {
        console.log(ctx.state);
        if (ctx.state === 'running') {
            console.log(ctx.state);
            if (oscillator) {
                if (grainPlaying) {
                    grainGain.disconnect();
                    grainPlaying = false;
                } else {
                    grainGain = ctx.createGain();
                    grainGain.connect(ctx.destination);
                    bufferSwitch(grainSample);
                    grainPlaying = true;
                }
            } else {
                ctx.suspend().then(function () {
                    console.log(ctx.state);
                    if (grainPlaying) {
                        grainGain.disconnect();
                        grainPlaying = false;
                    } else {
                        grainGain = ctx.createGain();
                        grainGain.connect(ctx.destination);
                        bufferSwitch(grainSample);
                        grainPlaying = true;
                    }
                });
            }
        } else if (ctx.state === 'suspended') {
            console.log(ctx.state);
            ctx.resume().then(function () {
                console.log(ctx.state);
                // start grains so some sound is coming when sound on button is clicked
                grainGain = ctx.createGain();
                grainGain.connect(ctx.destination);
                bufferSwitch(grainSample);
                grainPlaying = true;
            });
        }
    });

    const SourceInput = gs.addInput(PARAMS, 'source', { options: { Synthetic_Sound: 0, Guitar: 1, Piano: 2 , Orchestra_Tuning: 3} });
    SourceInput.on('change', function (ev) {
        grainSample = ev.value;
        bufferSwitch(grainSample);
    });

    const f = gs.addFolder({
        title: 'GRAIN SETTINGS',
        expanded: true,
    });

    const attackInput = f.addInput(PARAMS, 'attack', { min: 0.01, max: 1, step: 0.01 });
    attackInput.on('change', function (ev) {
        // change something
        //console.log(ev.value.toFixed(2));
        att = parseFloat(ev.value.toFixed(2)); // parse incoming value for grainmachine.js
    });

    const decayInput = f.addInput(PARAMS, 'decay', { min: 0.01, max: 1, step: 0.01 });
    decayInput.on('change', function (ev) {
        // change something
        dec = parseFloat(ev.value.toFixed(2)); // parse incoming value for grainmachine.js
    });
/*
    const densityInput = f.addInput(PARAMS, 'density', { min: 10, max: 500, step: 5 });
    densityInput.on('change', function (ev) {
        // change something
        rate = parseFloat(ev.value.toFixed());
    });
*/
    pane.addSeparator();

    const instr = pane.addFolder({
        title: 'THEREMIN CLASSIC',
    });

    const btnTheremin = instr.addButton({
        title: '► | ◼︎',
        label: 'sound',
    });

    //const btnInstr = instr.addButton({ title: ' PIANO ► | ◼︎' });

    btnTheremin.on('click', () => {
        console.log(ctx.state);
        if (ctx.state === 'running') {
            // add theremin voice to audio
            console.log(ctx.state);
            if (oscillator) {
                if (grainPlaying) {
                    soundPlaying = false;
                    oscillator.stop(ctx.currentTime);
                    oscillator.disconnect();
                    oscillator = null;
                } else {
                    ctx.suspend().then(function () {
                        // if no other voice is playing stop the context altogether
                        soundPlaying = false;
                        oscillator.stop(ctx.currentTime);
                        oscillator.disconnect();
                        oscillator = null;
                    });
                }
            } else {
                soundPlaying = true;
                oscillator = ctx.createOscillator();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.start(ctx.currentTime);
            }
        } else if (ctx.state === 'suspended') {
            // start audio with theremin voice
            console.log(ctx.state);
            ctx.resume().then(function () {
                soundPlaying = true;
                oscillator = ctx.createOscillator();
                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);
                oscillator.start(ctx.currentTime);
            });
        }
    });

    pane.addSeparator();
    const showInstructions = pane.addButton({ title: 'show instructions' });
    showInstructions.on('click', () => {
        hideIntro();
    });

    return scene;
};

// Create engine.
engine = createDefaultEngine();
if (!engine) {
    throw 'Engine should not be null';
}

// Create scene.
scene = createScene();
scene.then(function (returnedScene) {
    sceneToRender = returnedScene;
});

// Run render loop to render future frames.
engine.runRenderLoop(function () {
    if (sceneToRender) {
        sceneToRender.render();
    }
});

// Handle browser resize.
window.addEventListener('resize', function () {
    engine.resize();
});

// Helper
const map = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
