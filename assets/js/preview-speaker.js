
function getDecibels(type, audioElement) {
  let context = new (window.AudioContext || window.webkitAudioContext)();
  let src = context.createMediaElementSource(audioElement);
  let analyser = context.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  analyser.connect(context.destination);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function updateBar() {
    requestAnimationFrame(updateBar);
    analyser.getByteFrequencyData(dataArray);

    let total = 0;
    for (let i = 0; i < bufferLength; i++) {
      total += dataArray[i];
    }
    const average = total / bufferLength;

    //type => "speaker", "ring", "microphone"
    if (average > 0) {
      const levelElement = $("#" + type + "-level-preview"); // Obtener el elemento de nivel según el tipo
      const maxWidth = $(".meter-" + type + "-preview").width(); // Obtener el ancho máximo según el tipo
      const width = Math.min(maxWidth, (average * maxWidth) / 100); // Calcular el ancho del nivel

      levelElement.css("width", width + "px");
    }
  }

  updateBar();
}

async function playSpeakerLevelDevise() {
  $("#playSpeakerLevel").prop("disabled", true);
  (await navigator.mediaDevices.getUserMedia({ audio: true }))
    .getTracks()
    .forEach((track) => track.stop());

  var selectedDeviceId = $("#playbackSrc").val();
  console.log(selectedDeviceId);
  const aud = new Audio("./assets/sounds/conversation.mp3");
  aud.setSinkId(selectedDeviceId);
  aud.play();
  aud.onended = function () {
    $("#playSpeakerLevel").prop("disabled", false); // Volver a activar el botón
  };

  getDecibels("speaker", aud);
}

async function playRingLevelDevise() {
  $("#playRingLevel").prop("disabled", true);
  (await navigator.mediaDevices.getUserMedia({ audio: true }))
    .getTracks()
    .forEach((track) => track.stop());

  var selectedDeviceId = $("#ringDevice").val();
  console.log(selectedDeviceId);
  const aud = new Audio("./assets/sounds/ringtone.mp3");
  aud.setSinkId(selectedDeviceId);
  aud.play();
  aud.onended = function() {
    $('#playRingLevel').prop('disabled', false); // Volver a activar el botón
};
  getDecibels("ring", aud);
}

$("#playSpeakerLevel").click(playSpeakerLevelDevise);
$("#playRingLevel").click(playRingLevelDevise);
