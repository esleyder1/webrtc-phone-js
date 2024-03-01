let callDuration = 0;  
  // Función para formatear el tiempo en formato mm:ss
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  // Función para actualizar el contador de llamadas
  function updateCallDuration() {
    callDuration++; // Incrementar el contador en 1 segundo
    const formattedTime = formatTime(callDuration);
    $("#timerId").text(formattedTime);
    console.log("Duración de la llamada: " + formattedTime);
  }