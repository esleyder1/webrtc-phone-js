async function startRecording(stream) {
    const chunks = []; // Inicializamos el array de chunks aquí

    // Creamos el objeto MediaRecorder con el stream recibido
    const mediaRecorder = new MediaRecorder(stream);

    // Cuando hay datos disponibles, los almacenamos en el array chunks
    mediaRecorder.ondataavailable = function (event) {
      chunks.push(event.data);
      console.log("recording", chunks);
    };

    // Cuando la grabación se detiene, creamos el Blob con los chunks y generamos el enlace de descarga
    mediaRecorder.onstop = function () {
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
      const audioURL = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = audioURL;
      link.download = "mi_audio.ogg"; // Cambiamos la extensión del archivo a .ogg
      link.click();
    };
    // Comenzamos la grabación
    mediaRecorder.start();
  }