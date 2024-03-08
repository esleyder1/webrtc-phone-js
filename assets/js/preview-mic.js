// Declarar una variable para almacenar la referencia al objeto MediaStream
let mediaStream;

// Función para obtener el flujo de audio con el deviceId seleccionado
async function getAudioStream(selectedDeviceId) {
    try {
        // Detener el flujo de audio anterior si existe
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        // Obtener el nuevo flujo de audio con el deviceId seleccionado
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: selectedDeviceId } } });
        
        // Conecta el flujo de audio a un AudioContext
        const audioContext = new AudioContext();
        const microphone = audioContext.createMediaStreamSource(mediaStream);
        
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

            // Ajusta la anchura del nivel de decibelios
            const levelElement = $('#mic-level-preview');
            const maxWidth = $('.meter-micro-preview').width();
            const width = Math.min(maxWidth, average * maxWidth / 100); // Calcula la anchura normalmente
            const leftOffset = Math.max(0, maxWidth - width); // Calcula el desplazamiento a la izquierda

            levelElement.css('width', width + 'px');
            levelElement.css('rigth', leftOffset + 'px');

            // Llama recursivamente para continuar el análisis en tiempo real
            requestAnimationFrame(analyzeAudio);
        }

        // Iniciar el análisis de audio en tiempo real
        analyzeAudio();

        console.log('Se ha cambiado exitosamente el dispositivo de entrada de audio.');
    } catch (error) {
        console.error('Error al cambiar el dispositivo de entrada de audio:', error);
    }
}

// Iniciar el acceso al micrófono y la visualización del nivel de decibelios
navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
        // Guardar referencia al flujo de audio inicial
        mediaStream = stream;

        // Resto del código para configurar el análisis de audio y visualización del nivel de decibelios
        // Llamada a la función para configurar el análisis de audio con el flujo de audio inicial
        const selectedDeviceId = 'default'; // Puedes usar 'default' para el dispositivo predeterminado
        getAudioStream(selectedDeviceId);
    })
    .catch(function(err) {
        console.error('Error al acceder al micrófono:', err);
    });

$('#microphoneSrc').change(function () {
    var selectedDeviceId = $(this).val();
    // Llamar a la función getAudioStream para cambiar el dispositivo de entrada de audio
    getAudioStream(selectedDeviceId);
});
