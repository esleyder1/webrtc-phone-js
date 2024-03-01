let sessions = [];
let incomingCallAudio = new Audio("assets/sounds/ringtone.mp3");
incomingCallAudio.loop = true;

window.oSipAudio = document.createElement("audio");
let remoteAudio = new Audio();
remoteAudio.autoplay = true;

function addStreams() {
    sessions.forEach((session) => {
      session.connection.addEventListener("addstream", function (streamEvent) {
        incomingCallAudio.pause();
        remoteAudio.srcObject = streamEvent.stream;
        // Attach remote stream to remoteView
        incomingStream = streamEvent.stream;

        // Attach local stream to selfView
        $('#info-micro').show()
        const peerconnection = session.connection;
        const local = peerconnection.getLocalStreams()[0]
        const remote = peerconnection.getRemoteStreams()[0]        
        console.log("STREAM",remote.getAudioTracks())
        startRecording(remote)

        initializeSoundMeterLocal(local);
        initializeSoundMeterRemote(remote);
      });
    });
  }