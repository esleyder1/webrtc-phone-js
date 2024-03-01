function initializeSoundMeter(stream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    // Función para actualizar la barra de sonido
    function updateSoundMeter() {
      // Obtener datos de frecuencia del analizador
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      // Calcular el promedio de la amplitud
      let total = 0;
      for (let i = 0; i < bufferLength; i++) {
        total += dataArray[i];
      }
      const average = total / bufferLength;

      const levelElement = $("#speaker-level");
      const maxHeight = $(".sound-meter").height();
      const height = Math.min(maxHeight, (average * maxHeight) / 50); // Calcula la altura normalmente
      levelElement.css("height", height + "px");
      levelElement.css("bottom", "0");
      console.log("speaker", height);

      // Solicitar la próxima actualización de la visualización
      requestAnimationFrame(updateSoundMeter);
    }

    // Iniciar la actualización de la visualización
    updateSoundMeter();
  }