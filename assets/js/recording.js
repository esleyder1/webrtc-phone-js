const ac = new AudioContext();

// Función para grabar todos los flujos de audio disponibles
function startRecording(audioTracks) {
    // WebAudio MediaStream sources only use the first track.
    const sources = audioTracks.map(t => ac.createMediaStreamSource(new MediaStream([t])));

    // El destino producirá un flujo de audio mezclado.
    const dest = ac.createMediaStreamDestination();

    // Mezclar todos los flujos de audio
    sources.forEach(s => s.connect(dest));

    // Crear un grabador de medios para grabar el flujo de audio mezclado
    const recorder = new MediaRecorder(dest.stream);

    // Iniciar la grabación
    recorder.start();

    // Manejar eventos del grabador de medios
    recorder.ondataavailable = e => {
        console.log("Datos disponibles:", e.data);
        // Aquí podrías hacer algo con los datos, como enviarlos a un servidor.
    };

    recorder.onstop = () => {
        console.log("Grabación detenida");
        // Aquí podrías realizar acciones adicionales después de detener la grabación.
    };

    // Detener la grabación después de 10 segundos como ejemplo
    setTimeout(() => {
        recorder.stop();
    }, 10000);
}