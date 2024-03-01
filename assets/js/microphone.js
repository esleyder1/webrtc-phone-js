jQuery(function () {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      // Conecta el flujo de audio a un AudioContext
      const audioContext = new AudioContext();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      // Crea un analizador de audio
      const analyser = audioContext.createAnalyser();
      microphone.connect(analyser);

      // Configura el analizador de audio
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Función para analizar el audio en tiempo real
      function analyzeAudio() {
        analyser.getByteFrequencyData(dataArray);
        
        // Calcula el nivel de decibelios
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;

        // Ajusta la altura del nivel de decibelios
        const levelElement = $('#mic-level');
        const maxHeight = $('.meter').height();
        const height = Math.min(maxHeight, average * maxHeight / 100); // Calcula la altura normalmente
        levelElement.css('height', height + 'px');
        levelElement.css('bottom', '0');

        // Llama recursivamente para continuar el análisis en tiempo real
        requestAnimationFrame(analyzeAudio);
      }

      // Iniciar el análisis de audio en tiempo real
      //analyzeAudio();
    })
    .catch(function(err) {
      console.error('Error al acceder al micrófono:', err);
    });
});
