jQuery(function () {
  JsSIP.debug.disable("JsSIP:*");
  let configuration = null;
  let session = null;

  let callTaked = false;
  let userId = null;
  let timerInterval = null;
  let currentNotification = null;
  stateCall = null;

  let statusCallInTransference

  /*Opciones de JSSIP*/
  let callOptions = {
    extraHeaders: ["X-Foo: foo", "X-Bar: bar"],
    mediaConstraints: { audio: true, video: false },
    pcConfig: {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    },
  };

  /*Transferir llamada*/
  let options = {
    html: true,
    title: "Transferir llamada",
    content: $('[data-name="popover-content"]'),
  };
  var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
  tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    bootstrap.Tooltip.getOrCreateInstance(tooltipTriggerEl)
  })
    var transferPopover = document.getElementById("transferPopover");
  new bootstrap.Popover(transferPopover, options);

  $("#joinCall").click(function () {
    $('#offcanvasConference').offcanvas('toggle')
  });


  $("#transferPopover").click(function () {
    $("#btnHoldUnhold").click();
  });

  if (storedServer && storedUsername && storedPassword) {
    login(storedServer, storedUsername, storedPassword);
    //cambiar a block si se quiere mostrar el log card
    $("#containerStatus").hide();
  } else {
    showLogin();
  }

  //Función para iniciar sesión
  loginButton.on("click", function (e) {
    e.preventDefault();
    const server = $("#server").val();
    const sipUsername = $("#sipUsername").val();
    const sipPassword = $("#sipPassword").val();

    localStorage.setItem("server", server);
    localStorage.setItem("sipUsername", sipUsername);
    localStorage.setItem("sipPassword", sipPassword);

    login(server, sipUsername, sipPassword);
    //document.getElementById("containerStatus").style.display = "block";
  });

  //Función para ver la contraseña que se ingresó
  $("#revealPassword").on("click", function () {
    var passwordInput = $("#sipPassword");
    var toggleIcon = $(".toggle-password i");
    if (passwordInput.attr("type") === "password") {
      passwordInput.attr("type", "text");
      toggleIcon.removeClass("fa-eye").addClass("fa-eye-slash");
    } else {
      passwordInput.attr("type", "password");
      toggleIcon.removeClass("fa-eye-slash").addClass("fa-eye");
    }
  });

  //Botón para cerrar sesión.
  $("#btnLogout").click(function (event) {
    event.preventDefault();
    logout();
  });

  $("#btnRefresh").click(function (event) {
    event.preventDefault();
    login(storedServer, storedUsername, storedPassword);
  });

  //función para pulsar teclas del teléfono que se vá a llamar.
  $("#toCallButtons").on("click", ".dialpad-char", function (e) {
    if ($(this).hasClass("dialpad-char")) {
      let digit = $(this).attr("data-value");

      if (digit === "C") {
        const toField = $("#toField");
        toField.val("");
        if (toField.val() === "") {
          $("#wrapOptions").hide();
        }
      } else if (digit === "R") {
        const dest = localStorage.getItem("latestCall");
        //statusCall("Calling");
        if (dest) {
          phone.call(dest, callOptions);
        }
        // Reiniciar el contador de duración de la llamada
        callDuration = 0;
        stateCall = "call";

        updateUI();
        addStreams();
      } else {
        if (digit == "#") {
          digit = "pound";
        }
        if (digit == "*") {
          digit = "star";
        }
        if (audioFiles[digit]) {
          if (lastPlayedAudio) {
            // Detiene la reproducción del archivo de audio anterior si aún está reproduciéndose
            lastPlayedAudio.pause();
            lastPlayedAudio.currentTime = 0;
          }
          audioFiles[digit].play();
          lastPlayedAudio = audioFiles[digit]; // Actualiza el último archivo de audio reproducido
        } else {
          console.error(
            "El archivo de audio para el dígito " +
              digit +
              " no está disponible."
          );
        }

        if (digit == "pound") {
          digit = "#";
        }
        if (digit == "star") {
          digit = "*";
        }

        $("#wrapOptions").show();
        $("#toField").val($("#toField").val() + digit);
        $("#connectCall").attr("disabled", false);
        sessions.forEach((session) => {
          if (session.isEstablished()) {
            session.sendDTMF(digit);
          }
        });
      }
    }
  });

  let lastPlayedAudio = null;

  // Función para cargar los archivos de audio DTMF

  loadAudioFiles();

  //Función para borrar un número del telefono que se quiere llamar.
  $("#btnDeleteDial").on("click", function () {
    const toField = $("#toField");
    toField.val("");
    if (toField.val() === "") {
      $("#wrapOptions").hide();
    }
  });

  //Función para llamar a una extensión (botón llamar)
  $("#connectCall").click(function () {
     updateUI();
    const dest = $("#toField").val();
    //statusCall("Calling");
    const identificator = localStorage.getItem("sipUsername");
    if (dest !== "" && dest !== identificator) {
      phone.call(dest, callOptions);
      localStorage.setItem("latestCall", dest);
      statusCallConference(dest,"Llamando...")
    }

    $("#toField").val("");
    $(this).attr("disabled", true);

    // Reiniciar el contador de duración de la llamada
    callDuration = 0;
    stateCall = "call";

    addExtension('Llamando...', dest)
    addStreams();

  });

  //Función para responder la llamada
  $("#btnAnswer").click(function () {
    stateCall = "answer";
    sessions.forEach((session) => {
      session.answer(callOptions);
      if (currentNotification) {
        // Cerrar la notificación actual
        currentNotification.close();
        alert("Notificación closed");
        currentNotification = null; // Limpiar la referencia a la notificación
      }
      addStreams();
    });
  });

  //funcion para colgar la llamada
  $(".btnHangUp").click(function () {
    let type = $(this).data("type");
    stateCall = stateCall || type;

    sessions.forEach((session) => {
      console.log(session)
      session.terminate();
    });
    $("#listExtension").html("");
  });

  //Función que habilita el modo - Mute de la llamada.
  $("#mute").click(function () {
    sessions.forEach((session) => {
      if (session.isMuted().audio) {
        session.unmute({
          audio: true,
        });
        $(this)
          .find("i")
          .removeClass("fa-microphone-slash")
          .addClass("fa-microphone");
        $(this).removeClass("btn-light").addClass("btn-success");
        $("#info-micro").show();
      } else {
        session.mute({
          audio: true,
        });
        $(this)
          .find("i")
          .removeClass("fa-microphone")
          .addClass("fa-microphone-slash");
        $(this).removeClass("btn-light").addClass("btn-success");
      }
    });
    updateUI();
  });

  //Funcion que habilita el modo - Lllamada en espera.
  $("#btnHoldUnhold").on("click", function () {
    sessions.forEach((session) => {
      if (!session.isOnHold().local) {
        session.hold();
        $(this)
          .find("i")
          .removeClass("fa-circle-pause")
          .addClass("fa-circle-play");
        $(this).removeClass("btn-light").addClass("btn-success");
      } else {
        session.unhold();
        $(this)
          .find("i")
          .removeClass("fa-circle-play")
          .addClass("fa-circle-pause");
        $(this).removeClass("btn-success").addClass("btn-light");
      }
    });
    updateUI();
  });

  // Función para realizar la transferencia de llamada
  $(".btnTransferCall").click(function () {
    var type = $(this).data("id");
    const ext = $("#inputExtToTransfer").val();
    sessions.forEach((session) => {
      if (type == "blind") {
        //ciega
        session.refer(ext);
      } else {
        //atendida
        session.refer("sip:" + ext + "@" + storedServer, {
          referredBy: "sip:" + sipUsername + "@" + storedServer,
        });
      }
    });
    $("#inputExtToTransfer").val("");
    $("#transferPopover").popover("hide");

    $(this).find("i").removeClass("fa-circle-play").addClass("fa-circle-pause");
    $(this).removeClass("btn-success").addClass("btn-light");
  });

  $("#toField").on("keypress", function (e) {
    if (e.which === 13) {
      // Enter
      $("#connectCall").click();
    }
  });

  // Función que habilita el modo no molestar.(DND)
  $("#btnDND").click(function (event) {
    event.preventDefault();
    if (isDND) {
      isDND = false;
      $(this).find("span").text("No Molestar");
      $(this).addClass("text-bg-ligth").removeClass("text-bg-success");
    } else {
      isDND = true;
      $(this).addClass("text-bg-success").removeClass("text-bg-ligth");
    }
  });

  //Función que habilita
  $("#btnAA").click(function (event) {
    event.preventDefault();
    if (isAA) {
      isAA = false;
      $(this).addClass("text-bg-ligth").removeClass("text-bg-success");
    } else {
      isAA = true;
      $(this).addClass("text-bg-success").removeClass("text-bg-ligth");
    }
  });

  $("#toField").on("input", function () {
    var extension = $(this).val();
    if (extension.length >= 1) {
      $("#wrapOptions").show();
      $("#connectCall").attr("disabled", false);
    } else {
      $("#wrapOptions").hide();
      $("#connectCall").attr("disabled", true);
    }
  });

  $("#btnAddToConference").click(function () {
    const dest = $("#inputExtToConference").val();
    const identificator = localStorage.getItem("sipUsername");
    if (dest && dest !== identificator) {
      addExtension("call",dest)
      statusCallInTransference = "Llamando"
      phone.call(dest, callOptions);
    } else {
      alert("No puedes realizar una llamada a tu propio identificador.");
    }
    $("#inputExtToConference").val("");
  });

  navigator.mediaDevices
  .enumerateDevices()
  .then(function (devices) {
      // Filtrar los dispositivos de audio de salida (altavoces)
      var audioOutputDevices = devices.filter(function (device) {
          return device.kind === "audiooutput"; // Dispositivos de salida de audio (altavoces)
      });

      // Llenar los selectores con los dispositivos encontrados
      audioOutputDevices.forEach(function (device) {
          $("#playbackSrc, #ringDevice").append(
              '<option value="' +
              device.deviceId +
              '">' +
              (device.label || 'Altavoces') + // Usar 'Altavoces' si no hay etiqueta disponible
              "</option>"
          );
      });

      // Filtrar los dispositivos de entrada de audio (micrófonos)
      var audioInputDevices = devices.filter(function (device) {
          return device.kind === "audioinput"; // Dispositivos de entrada de audio (micrófonos)
      });

      // Llenar el selector con los micrófonos
      audioInputDevices.forEach(function (device) {
          $("#microphoneSrc").append(
              '<option value="' +
              device.deviceId +
              '">' +
              (device.label || 'Micrófono') + // Usar 'Micrófono' si no hay etiqueta disponible
              "</option>"
          );
          getAudioStream(device.deviceId); // No estoy seguro de si deseas llamar a esta función aquí o no
      });

  })
  .catch(function (err) {
      console.error("Error al enumerar dispositivos de audio: " + err);
  });



});
