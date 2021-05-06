
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

    const dsm = new BABYLON.DeviceSourceManager(engine);

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
    videoTexture.video.type = "video/mp4";
    videoTexture.video.muted = true;
    //videoTexture.video.controls = true; 
    videoTexture.video.playsinline = true;
    videoMaterial.diffuseTexture = videoTexture;
    videoMaterial.emissiveColor = new BABYLON.Color3.White();
    videoPlane.material = videoMaterial;

    videoTexture.video.pause();

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
    var contour = ctx.createGain();
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
        //contour.gain.setValueAtTime(0, ctx.currentTime);
        //contour.gain.linearRampToValueAtTime(0.6 * rand(0.5, 1), ctx.currentTime + att);
        //gainNode.connect(contour);
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
        start: 0,
        end: 0,
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

    //console.log("video duration "+ videoTexture.video.duration);


        // --------- variables to manage video controls
        let start = 0;
        let end;
        //let markIn, markOut;
        let inset = false;
        let outset = false;
        let reset=false;
        let loop = false;
        let timerID;

        var checkEndCB = () => {
            if (videoTexture.video.paused) {
                return;
              }
              if(videoTexture.video.ended){
                  end = videoTexture.video.currentTime;
              }
        }
    
   var playVideo = () => {
        videoTexture.video.play();
    };

    var stopVideo = () => {
        videoTexture.video.pause();
    };

    var pauseVideo = () => {
        videoTexture.video.pause();
    };

    var frameForward = () => {
        //if(outset){
            if(videoTexture.video.currentTime + 1 > end){
                //highlight markOut boundar
                console.log("mark out boundary reached");
                videoTexture.video.currentTime = videoTexture.video.currentTime + 1 ;
            }
       // }
        else {
            videoTexture.video.currentTime = videoTexture.video.currentTime + 1 ;
        }
        
    };

    var frameBackward = () => {
        //if(inset){
            if(videoTexture.video.currentTime - 1 < start){
                //highlight markOut boundar
                console.log("mark in boundary reached");
                videoTexture.video.currentTime = videoTexture.video.currentTime - 1 ;
            }
        //}
        else {
            videoTexture.video.currentTime = videoTexture.video.currentTime - 1 ;
        }
        
    };
        


    var markReset = () => {
        inset, outset = false;
        start = 0;
        
    };
    // var markIn = (markIn, markReset) => {
    //     start = markIn;
    //     //if(!videoTexture.video.paused){
    //     videoTexture.video.pause();
    //     //}
    // };
    // var markOut = (markOut, markReset) => {
    //     end = markOut;
    //     videoTexture.video.pause();

    //     // if (videoTexture.video.paused || videoTexture.video.ended) {
    //     //            return;
    //     //         }

    //     // an event or callback that is checking every once in a while if the current time is equal
    //     // to the mark out time. 


    //     let timerId = setInterval(() => checkMarks(markIn,markOut), 500);
    // }
    
    var checkMarks = (start,end) => {
        if( videoTexture.video.currentTime + 1 > end){
            console.log("video reached mark out");
             if(loop){
                 console.log("start: " + start+ " end : "+end);
                videoTexture.video.currentTime = start;
                playVideo();
                return;
             }
            videoTexture.video.pause();
        };
    };

    checkBoundary = () =>{

    };
    var playBetween = (start,end) => {
        if(videoTexture.video.paused){
            if( videoTexture.video.currentTime + 1 > end){
                videoTexture.video.currentTime = start;
                playVideo();
        }
        else if(videoTexture.video.currentTime > start && videoTexture.video.currentTime < end){
            playVideo();
        }
    }   
    };

    // Create and configure textblock with instructions
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    const controlsText = new BABYLON.GUI.TextBlock();
    controlsText.text = "Click any key on keyboard to show video controls";
    controlsText.color = "white";
    controlsText.fontStyle = "bold";
    controlsText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    controlsText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    controlsText.fontSize = 24;
    advancedTexture.addControl(controlsText);





    /*
* onAfterDeviceConnectedObservable:
* One of two observables that works around a device being connected/added
* to the DeviceSourceManager instance.  This observable activates after
* the given device is connected.  The "device" parameter has two members, 
* deviceType (Assigned type of connected device; BABYLON.DeviceType) and 
* deviceSlot (Assigned slot of connected device; number).
* 
* The other connected observable is onBeforeDeviceConnectedObservable.
*/

    dsm.onDeviceConnectedObservable.add((device) => {
        let shieldButton = "n/a";
        let fireButton = "n/a";
        let boostButton = "n/a";

        switch (device.deviceType) {
            case BABYLON.DeviceType.Keyboard:
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                shieldButton = "P";
                fireButton = "Spacebar";
                boostButton = "X";
                forward = "f";
                backward = "b";
                IN = "I";
                OUT = "O";
                controlsText.text = `Established link to ${BABYLON.DeviceType[device.deviceType]}\n`;
                controlsText.text += `Video Controls:\nscroll 1 second: b|f\nPlay: ${shieldButton}\nPause: ${fireButton}\nmark IN: ${IN}\nmark OUT: ${OUT}\nloop: l\nReset marks: ${boostButton}`;
                break;

        }


    });

    /*
     * onAfterDeviceDisconnectedObservable:
     * One of two observables that works around a device being disconnected/removed
     * to the DeviceSourceManager instance.  This observable activates after
     * the given device is disconnected.  The "device" parameter has two members, 
     * deviceType (Assigned type of connected device; BABYLON.DeviceType) and 
     * deviceSlot (Assigned slot of connected device; number).
     * 
     * The other connected observable is onBeforeDeviceDisconnectedObservable.
     */
    dsm.onDeviceDisconnectedObservable.add((device) => {
        controlsText.color = "white";
        controlsText.text = `Lost connection to ${BABYLON.DeviceType[device.deviceType]}`;
    });

    var logControls = () => {
        console.log("cur time:"+videoTexture.video.currentTime+" start: "+start + " end: "+end+" inset: "+inset+" outset: "+outset+" reset: "+reset+" loop: "+loop);

    };

    // "Game" Loop
    scene.registerBeforeRender(() => {

        /*
         * getDeviceSource and getInput:
         * At a minimum, you'll need to use the getInput function to read 
         * data from user input devices.
         * 
         * In Typescript, you can combine the getDeviceSource and getInput in the 
         * if statements into a single like by using the null-conditional operator.
         * 
         * e.g. if(dsm.getDeviceSource(BABYLON.DeviceType.Keyboard)?.getInput(90) == 1)
         */
        if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard)) {
            if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(80) == 1) { // play
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop:l\n Reset marks: X";
                //playVideo();
                //setInterval(()=>checkEnd(),500);
                logControls();
                if(outset || inset){
                    playBetween(start,end);
                    timerID = setInterval(()=> checkMarks(start,end),500);
                   
                    playVideo();

                }
                else {
                    playVideo();
                }
                
                
            }
            if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(32) == 1) { // space bar
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                pauseVideo();
                logControls();
                
            }
            if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(88) == 1) { // reset marks
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                color1 = new BABYLON.Color4(1.0, 0.8, 0.8, 1.0);
                color2 = new BABYLON.Color4(1.0, 0.5, 0.5, 1.0);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                //stopVideo();
                inset=false;
                outset = false;
                start = 0;
                end = videoTexture.video.duration;
                clearInterval(timerID);
                logControls();
                
            }
            if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(66) == 1) { // b = backwards <<
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                frameBackward();
                logControls();
                
            }
            else if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(70) == 1) { // f  = forwards >>
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                frameForward();
                logControls();
            }
            else if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(73) == 1) { // i = mark in
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                pauseVideo();
                start = videoTexture.video.currentTime;
                inset = true;
                logControls();
                
               
            }
            else if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(79) == 1) { // o = mark out
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                pauseVideo();
                end = videoTexture.video.currentTime;
                outset = true;
                logControls();
                
            }
            else if (dsm.getDeviceSource(BABYLON.DeviceType.Keyboard).getInput(76) == 1) { // l = loop selected frames / part of video 
                currentColor = new BABYLON.Color3(1, 0.5, 0.5);
                controlsText.color = "red";
                controlsText.text = "Video Controls:\nscroll 1 second: b|f\nPlay: P\nPause: Spacebar\nmark in: I\nmark out: O\nloop: l\nReset marks: X";
                if(loop) {
                    loop = false; 
                }
                else {loop=true};
                logControls();
                
            }
        }



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
    update();
});

function update() {

};

// Handle browser resize.
window.addEventListener('resize', function () {
    engine.resize();
});

// Helper
const map = (value, x1, y1, x2, y2) => ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
