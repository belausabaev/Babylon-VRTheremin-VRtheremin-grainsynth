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

    let hemisphericLight = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 10, 0), scene);
    hemisphericLight.intensity = 1;
    let light = new BABYLON.PointLight('spotLight', new BABYLON.Vector3(0, 1.2, -0.2), scene);
    light.intensity = 0.2;

    scene.clearColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    // scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    // scene.fogColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    // scene.fogDensity = 0.2;

    var pitchAntennaPosition = new BABYLON.Vector3();
    var volumeAntennaPosition = new BABYLON.Vector3();

    BABYLON.SceneLoader.ImportMesh('', '', 'THEREMIN.babylon', scene, function () {
        // Get location of antennae
        pitchAntennaPosition = scene.getMeshByName('PitchAntenna').position;
        volumeAntennaPosition = scene.getMeshByName('VolumeAntenna').position;
    });

    // ------- FILM CLIP ON PLANE -------
    var videoPlane = BABYLON.MeshBuilder.CreatePlane('plane', { width: 8, height: 4.5 }, scene);
    videoPlane.position = new BABYLON.Vector3(0, 2, 6);

    var videoMaterial = new BABYLON.StandardMaterial('texture1', scene);
    // videoMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);

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

    poseNet = ml5.poseNet(video, options, modelReady);

    function modelReady() {
        console.log('model Loaded');
    }

    // ------- SPHERES -------
    let sphereLeft = BABYLON.Mesh.CreateSphere('sphereLeft', 16, 0.1);
    sphereLeft.position.x = -0.32;
    sphereLeft.position.y = 1.1;
    sphereLeft.position.z = -0.1;
    let sphereLeftMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereLeftMat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.5);
    sphereLeft.material = sphereLeftMat;

    let sphereRight = BABYLON.Mesh.CreateSphere('sphereRight', 16, 0.1);
    sphereRight.position.x = 0.17;
    sphereRight.position.y = 1.1;
    sphereRight.position.z = -0.1;
    let sphereRightMat = new BABYLON.StandardMaterial('sphereMat', scene);
    sphereRightMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1);
    sphereRight.material = sphereRightMat;

    // Listen to new 'pose' events
    poseNet.on('pose', function (results) {
        if (results.length > 0) {
            poses = results[0].pose;

            rightPosX = map(poses.rightWrist.x, 100, 255, 0.05, 0.8);
            rightPosY = map(poses.rightWrist.y, 255, 0, 1, 1.8);
            leftPosX = map(poses.leftWrist.x, 100, 255, -0.25, -0.1);
            leftPosY = map(poses.leftWrist.y, 255, 0, 1, 1.8);

            sphereRight.position.x = rightPosX;
            sphereRight.position.y = rightPosY;
            sphereLeft.position.x = leftPosX;
            sphereLeft.position.y = leftPosY;

            
            posY = map(poses.leftWrist.y, 0, video.height, 0, window.innerHeight);
            posX = map(poses.rightWrist.x, 0, video.width, 0, window.innerWidth);
            grains(posX,posY); 
    
        }
    });

        // GUI for grain params
        var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

        var panel = new BABYLON.GUI.StackPanel();
        panel.width = "220px";
        panel.fontSize = "14px";
        panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
        panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        advancedTexture.addControl(panel);
    
        var button1 = BABYLON.GUI.Button.CreateSimpleButton("but1", "Start Grains");
        button1.width = "80px"
        button1.height = "20px";
        button1.color = "white";
        button1.cornerRadius = 20;
        button1.background = "green";
        button1.onPointerUpObservable.add(function() {
            if (ctx.state === 'running') {
                    ctx.suspend().then(function () {
                        //startBtn.textContent = 'Resume context';
                    });
                } else if (ctx.state === 'suspended') {
                    ctx.resume().then(function () {
                        //susresBtn.textContent = 'Suspend context';
                    });
                }
        });
        panel.addControl(button1);
    
        var checkboxElems = new BABYLON.GUI.Checkbox();
        checkboxElems.width = "20px";
        checkboxElems.height = "20px";
        checkboxElems.isChecked = true;
        checkboxElems.color = "green";
        checkboxElems.onIsCheckedChangedObservable.add(function (value) {
            checkboxElems.isChecked = true;
            bufferSwitch(0);
        });
        var checkboxGtr = new BABYLON.GUI.Checkbox();
        checkboxGtr.width = "20px";
        checkboxGtr.height = "20px";
        checkboxGtr.isChecked = false;
        checkboxGtr.color = "green";
        checkboxGtr.onIsCheckedChangedObservable.add(function (value) {
            checkboxGtr.isChecked = true;
            bufferSwitch(1);
        });
        var checkboxPn = new BABYLON.GUI.Checkbox();
        checkboxPn.width = "20px";
        checkboxPn.height = "20px";
        checkboxPn.isChecked = false;
        checkboxPn.color = "green";
        checkboxPn.onIsCheckedChangedObservable.add(function (value) {
            checkboxPn.isChecked = true;
            bufferSwitch(2);
        });
    
    
    
    
        // var headerSample = new BABYLON.GUI.TextBlock();
        // headerSample.text = "Elements";
        // headerSample.height = "30px";
        // headerSample.color = "white";
        // headerSample.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        // headerSample.marginTop = "10px";
        // panel.addControl(headerSample);
    
        // var sliderSample = new BABYLON.GUI.Slider();
        // sliderSample.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        // sliderSample.minimum = 1;
        // sliderSample.maximum = 3;
        // sliderSample.color = "green";
        // sliderSample.value = 2;
        // sliderSample.height = "20px";
        // sliderSample.width = "200px";
        // sliderSample.onValueChangedObservable.add(function (value) {
        //     if(value == 1){
        //         headerSample.text = "Elements";
        //         bufferSwitch(0);
        //     }
        //     else if(value == 2){
        //         headerSample.text = "Guitar";
        //         bufferSwitch(1);
        //     }
        //     else if(value == 3){
        //         headerSample.text = "Piano";
        //         bufferSwitch(2);
        //     }
    
        // });
        // panel.addControl(sliderSample);
    
        var panelForCheckboxElems = BABYLON.GUI.Control.AddHeader(checkboxElems, "Elements", "180px", { isHorizontal: true, controlFirst: true });
        panelForCheckboxElems.color = "white";
        panelForCheckboxElems.height = "20px";
        panelForCheckboxElems.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(panelForCheckboxElems);
    
        var panelForCheckboxGuitar = BABYLON.GUI.Control.AddHeader(checkboxGtr, "Guitar", "180px", { isHorizontal: true, controlFirst: true });
        panelForCheckboxGuitar.color = "white";
        panelForCheckboxGuitar.height = "20px";
        panelForCheckboxGuitar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(panelForCheckboxGuitar);
    
        var panelForCheckbox = BABYLON.GUI.Control.AddHeader(checkboxPn, "Piano", "180px", { isHorizontal: true, controlFirst: true });
        panelForCheckbox.color = "white";
        panelForCheckbox.height = "20px";
        panelForCheckbox.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        panel.addControl(panelForCheckbox);
    
    
        var headerAtt = new BABYLON.GUI.TextBlock();
        headerAtt.text = "Grain Attack Time";
        headerAtt.height = "30px";
        headerAtt.color = "white";
        headerAtt.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        headerAtt.marginTop = "10px";
        panel.addControl(headerAtt);
    
    
    
    
        var sliderAtt = new BABYLON.GUI.Slider();
        sliderAtt.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        sliderAtt.minimum = 0.01;
        sliderAtt.maximum = 1;
        sliderAtt.color = "green";
        sliderAtt.value = 0.1;
        sliderAtt.height = "20px";
        sliderAtt.width = "200px";
        sliderAtt.onValueChangedObservable.add(function (value) {
            att = parseFloat(value.toFixed(2));
            headerAtt.text = "Grain Attack Time: " + att;
            console.log("attack time: "+ att)
        });
        panel.addControl(sliderAtt);
    
        var headerDec = new BABYLON.GUI.TextBlock();
        headerDec.text = "Grain Decay Time";
        headerDec.height = "30px";
        headerDec.color = "white";
        headerDec.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        headerDec.marginTop = "10px";
        panel.addControl(headerDec);
    
        var sliderDec = new BABYLON.GUI.Slider();
        sliderDec.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        sliderDec.minimum = 0.01;
        sliderDec.maximum = 1;
        sliderDec.color = "green";
        sliderDec.value = 0.1;
        sliderDec.height = "20px";
        sliderDec.width = "200px";
        sliderDec.onValueChangedObservable.add(function (value) {
            dec = parseFloat(value.toFixed(2));
            headerDec.text = "Grain Decay Time: " + dec ;
            console.log("decay time: "+ dec)
        });
        panel.addControl(sliderDec);
    
    
    
        var headerDensity = new BABYLON.GUI.TextBlock();
        headerDensity.text = "Grain Density";
        headerDensity.height = "30px";
        headerDensity.color = "white";
        headerDensity.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        headerDensity.marginTop = "10px";
        panel.addControl(headerDensity);
    
        var sliderDens = new BABYLON.GUI.Slider();
        sliderDens.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        sliderDens.minimum = 10;
        sliderDens.maximum = 500;
        sliderDens.color = "green";
        sliderDens.value = 35;
        sliderDens.height = "20px";
        sliderDens.width = "200px";
        sliderDens.onValueChangedObservable.add(function (value) {
            rate = parseFloat(value.toFixed());
            headerDensity.text = "Grain Density: " + rate;
            //console.log("density time: "+ rate)
        });
        panel.addControl(sliderDens);
    
    
        // Initialize XR experience with default experience helper.
       // const xr = await scene.createDefaultXRExperienceAsync({
       //     floorMeshes: [scene.getMeshByName('Floor')],
       // });

       
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



