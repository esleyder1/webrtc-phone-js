jQuery(function () {
  let configuration = null;
  let session = null;

  let isDND = false;
  let isAA = false;
  let callTaked = false;
  let userId = null;
  let timerInterval = null;

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
  var transferPopover = document.getElementById("transferPopover");
  new bootstrap.Popover(transferPopover, options);

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
          "El archivo de audio para el dígito " + digit + " no está disponible."
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
      console.log(digit.toString(), "", "info");

      sessions.forEach((session) => {
        if (session.isEstablished()) {
          session.sendDTMF(digit);
        }
      });
    }
  });

  let lastPlayedAudio = null;

  // Función para cargar los archivos de audio DTMF

  loadAudioFiles();

  //Función para borrar un número del telefono que se quiere llamar.
  $("#btnDeleteDial").on("click", function () {
    const toField = $("#toField");
    toField.val(toField.val().slice(0, -1));
    if (toField.val() === "") {
      $("#wrapOptions").hide();
    }
  });

  //Función para llamar a una extensión (botón llamar)
  $("#connectCall").on("click", function () {
    const dest = $("#toField").val();
    //statusCall("Calling");
    phone.call(dest, callOptions);

    $("#toField").val("");
    $(this).attr("disabled", true);

    // Reiniciar el contador de duración de la llamada
    callDuration = 0;

    // Iniciar el temporizador
    timerInterval = setInterval(updateCallDuration, 1000);
    console.log(timerInterval);
    updateUI();
    addStreams();
  });

  //Función para responder la llamada
  $("#btnAnswer").click(function () {
    sessions.forEach((session) => {
      console.log("Hold", "", "info");
      session.answer(callOptions);
      addStreams();
    });
  });

  //funcion para colgar la llamada
  $(".btnHangUp").click(function () {
    sessions.forEach((session) => {
      session.terminate();
    });
  });

  //Función que habilita el modo - Mute de la llamada.
  $("#mute").click(function () {
    console.log("MUTE CLICKED");
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
        $("#info-micro").hide();
      }
    });
    updateUI();
  });

  //Funcion que habilita el modo - Lllamada en espera.
  $("#btnHoldUnhold").on("click", function () {
    sessions.forEach((session) => {
      console.log("status", session.isOnHold().local);
      if (!session.isOnHold().local) {
        session.hold();
        console.log("Hold", "", "info");
        $(this)
          .find("i")
          .removeClass("fa-circle-pause")
          .addClass("fa-circle-play");
        $(this).removeClass("btn-light").addClass("btn-success");
      } else {
        session.unhold();
        console.log("unHold", "", "info");
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
    console.log(ext, storedServer);
    sessions.forEach((session) => {
      if (type == "blind") {
        console.log("type", type);
        console.log("Transfer", "sip:" + ext + "@" + storedServer);
        session.refer(ext);
      } else {
        console.log("type", type);
        console.log("Transfer", "sip:" + ext + "@" + storedServer);
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
    phone.call(dest, callOptions);
  });

});
