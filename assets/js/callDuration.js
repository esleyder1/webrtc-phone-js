let callDuration = 0;
// Almacenar el identificador del intervalo
let timerInterval;

// Función para formatear el tiempo en formato mm:ss
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}
// Función para actualizar el contador de llamadas
function updateCallDuration() {
  callDuration++; // Incrementar el contador en 1 segundo
  const formattedTime = formatTime(callDuration);
  $("#timerId").text(formattedTime);
}
function startTimer() {
  // Verificar si ya hay un intervalo en ejecución para evitar múltiples intervalos
  if (!timerInterval) {
    timerInterval = setInterval(updateCallDuration, 1000);
  }
}

// Función para detener el contador
function stopTimer() {
  clearInterval(timerInterval); // Detener el intervalo de tiempo
  timerInterval = null; // Restablecer el identificador del intervalo
  callDuration = 0; // Reiniciar la duración de la llamada
  const formattedTime = formatTime(callDuration); // Formatear el tiempo a 00:00
  $("#timerId").text(formattedTime); // Actualizar el texto en el elemento HTML
}