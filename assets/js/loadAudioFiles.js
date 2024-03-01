let audioFiles = {};
function loadAudioFiles() {
    let digits = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "pound",
      "star",
    ];
    digits.forEach(function (digit) {
      let audioSrc = "assets/sounds/dtmf/" + digit + ".mp3";
      audioFiles[digit] = new Audio(audioSrc);
      audioFiles[digit].addEventListener("ended", function () {
        lastPlayedAudio = null;
      });
    });
  }