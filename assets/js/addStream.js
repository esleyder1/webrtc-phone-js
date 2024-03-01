let sessions = [];
let incomingCallAudio = new Audio("assets/sounds/ringtone.mp3");
incomingCallAudio.loop = true;

window.oSipAudio = document.createElement("audio");
let remoteAudio = new Audio();
remoteAudio.autoplay = true;

function addStreams() {
    sessions.forEach((session) => {
      session.connection.addEventListener("addstream", function (streamEvent) {
        console.log("addstreams", streamEvent);
        incomingCallAudio.pause();
        remoteAudio.srcObject = streamEvent.stream;
        // Attach remote stream to remoteView
        incomingStream = streamEvent.stream;

        // Attach local stream to selfView
        const peerconnection = session.connection;
        startRecording(peerconnection.getLocalStreams()[0]);
        initializeSoundMeter(peerconnection.getRemoteStreams()[0]);

        console.log(
          "addstream peerconnection local and remote stream counts ",
          peerconnection.getLocalStreams().length,
          peerconnection.getRemoteStreams().length
        );
      });
    });
  }