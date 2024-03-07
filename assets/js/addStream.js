let sessions = [];
let localChunks = [];
let remoteChunks = [];
let incomingCallAudio = new Audio("assets/sounds/ringtone.mp3");
incomingCallAudio.loop = true;

var recordedChunks = [];

let recorder

window.oSipAudio = document.createElement("audio");
let remoteAudio = new Audio();
remoteAudio.autoplay = true;

var mixedAudioStream;
var recordedChunks = [];


var localRecorder, remoteRecorder;


function addStreams() {
    sessions.forEach((session) => {

      
      session.connection.ontrack = function(event) {
        incomingCallAudio.pause();
        remoteAudio.srcObject = event.streams[0];
        $('#info-micro').show()
        const peerconnection = session.connection;
        const local = peerconnection.getLocalStreams()[0]
        const remote = peerconnection.getRemoteStreams()[0]        

        initializeSoundMeterLocal(local);
        initializeSoundMeterRemote(remote);
    
        // Aquí puedes almacenar el stream o realizar cualquier otra acción al finalizar
    };
    });
  }