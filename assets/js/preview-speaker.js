let audioElement;

function getDecibels(audioElement) {
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

        if (average > 0) {
            const levelElement = $("#speaker-level-preview");
            const maxWidth = $(".meter-speaker-preview").width();
            const width = Math.min(maxWidth, (average * maxWidth) / 100);
            levelElement.css("width", width + "px");
        }
    }

    updateBar();
}

function togglePlay() {
    if (!audioElement) {
        audioElement = new Audio();
        audioElement.src = './assets/sounds/conversation.mp3'; // Asigna la URL del audio
        audioElement.addEventListener('canplay', function() {
            audioElement.play();
        });
        getDecibels(audioElement);
    }

    if (audioElement.paused) {
        audioElement.play();
        $('#playButton').text('Pausar');
    } else {
        audioElement.pause();
        $('#playButton').text('Reproducir');
    }
}

$('#playButton').click(togglePlay);
