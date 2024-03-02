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
       
        //startRecording(incomingStream);

        // Attach local stream to selfView
        $('#info-micro').show()
        const peerconnection = session.connection;
        const local = peerconnection.getLocalStreams()[0]
        const remote = peerconnection.getRemoteStreams()[0]        
        console.log("STREAM",remote.getAudioTracks())
        //startRecording(local,remote)

        initializeSoundMeterLocal(local);
        initializeSoundMeterRemote(remote);




        session.connection.addEventListener('track', (event) => {
          console.log(event);
          if (event.streams && event.streams[0]) {
              const remoteStream = event.streams[0]; // Obtener el stream remoto
              console.log("REMOTE",remoteStream)
              //startRecording(remoteStream);
              if (local && remoteStream) {
                // Obtener las pistas de audio de los flujos de medios
                const localAudioTrack = local.getAudioTracks()[0];
                const remoteAudioTrack = remoteStream.getAudioTracks()[0];
                
                // Iniciar la grabación con las pistas de audio
                startRecording([localAudioTrack, remoteAudioTrack]);
            } else {
                console.error("El flujo de audio local o remoto no está definido.");
            }
    
          }
      });
      });
    });
  }