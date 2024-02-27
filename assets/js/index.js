jQuery(function () {
  let loginButton = $("#loginButton");
  let userLabel = $("#user");

  let storedServer = localStorage.getItem("server");
  let storedUsername = localStorage.getItem("sipUsername");
  let storedPassword = localStorage.getItem("sipPassword");

  logContainer = $("#status");
  loginButton = $("#loginButton");
  logoutButton = $("#logoutButton");
  var options = {
    html: true,
    title: "Transferir llamada",
    //html element
    //content: $("#popover-content")
    content: $('[data-name="popover-content"]'),
    //Doing below won't work. Shows title only
    //content: $("#popover-content").html()
  };
  var transferPopover = document.getElementById("transferPopover");
  new bootstrap.Popover(transferPopover, options);

  $("#transferPopover").click(function () {
    $("#btnHoldUnhold").click();
  });

  let configuration = null;
  let audioFiles = {};
  let session = null;
  let sessions = [];
  let phone;
  let isDND = false;
  let isAA = false;

  let callTaked = false;
  let userId = null;

  let mediaRecorder = null;
  var callCount = 1;
let recordedChunks = [];

  let callDuration = 0; // Variable para almacenar la duración de la llamada en segundos
let timerInterval = null; // Variable para almacenar el intervalo del temporizador

  window.oSipAudio = document.createElement("audio");

  let callOptions = {
    media: {
      constraints: {
        audio: true,
        video: false,
      },
    },
    rtcOfferConstraints: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    },
    pcConfig: {
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      iceTransportPolicy: "all",
    },
  };

  let incomingCallAudio = new Audio("assets/sounds/ringtone.mp3");
  incomingCallAudio.loop = true;
  let remoteAudio = new Audio();
  remoteAudio.autoplay = true;

  function startRecording(stream) {
    // Crear un nuevo objeto MediaRecorder con el flujo de audio
    mediaRecorder = new MediaRecorder(stream);

    // Array para almacenar los fragmentos de audio
    var chunks = [];

    // Escuchar el evento de datos disponibles
    mediaRecorder.ondataavailable = function(event) {
        chunks.push(event.data);
    }

    // Escuchar el evento de finalización de la grabación
    mediaRecorder.onstop = function() {
        // Combinar los fragmentos de audio en un Blob
        var audioBlob = new Blob(chunks, { 'type' : 'audio/wav' });

        // Crear un enlace de descarga para el archivo de audio
        var audioUrl = URL.createObjectURL(audioBlob);
        var link = document.createElement('a');
        link.href = audioUrl;

        // Nombre del archivo de audio
        var filename = 'llamada_' + callCount + '.wav';
        link.download = filename;

        document.body.appendChild(link);
        link.click();

        // Incrementar el contador de llamadas
        callCount++;

        // Limpiar
        chunks = [];
        mediaRecorder = null;
    }

    // Iniciar la grabación
    mediaRecorder.start();
}



  function addStreams() {
    sessions.forEach((session) => {
      session.connection.addEventListener("addstream", function (streamEvent) {
        console.log("addstreams", streamEvent);
        incomingCallAudio.pause();
        remoteAudio.srcObject = streamEvent.stream;
        // Attach remote stream to remoteView

        startRecording(streamEvent.stream)
    
        // Attach local stream to selfView
        const peerconnection = session.connection;
        console.log(
          "addstream peerconnection local and remote stream counts ",
          peerconnection.getLocalStreams().length,
          peerconnection.getRemoteStreams().length
        );
      });

    });


  }

// Función para formatear el tiempo en formato mm:ss
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// Función para actualizar el contador de llamadas
function updateCallDuration() {
    callDuration++; // Incrementar el contador en 1 segundo
    const formattedTime = formatTime(callDuration);
    console.log("Duración de la llamada: " + formattedTime);
}

  // Función para mostrar el formulario de inicio de sesión
  function showLogin() {
    $("#wrapLogin").show();
    $("#wrapper").hide();
    setLoginFromValues();
  }

  // Función para ocultar el formulario de inicio de sesión
  function hideLogin() {
    $("#wrapLogin").hide();
    $("#wrapper").show();
  }

  // Función para establecer los valores del formulario de inicio de sesión desde el almacenamiento local
  function setLoginFromValues() {
    $("#server").val(storedServer);
    $("#sipUsername").val(storedUsername);
    $("#sipPassword").val(storedPassword);
  }

  // Función para iniciar sesión
  function login(server, sipUsername, sipPassword) {
    JsSIP.debug.enable("JsSIP:*");
    userLabel.text("sip:" + sipUsername + "@" + server);
    const socket = new JsSIP.WebSocketInterface(`wss://${server}:8089/ws`);
    configuration = {
      sockets: [socket],
      uri: "sip:" + sipUsername + "@" + server,
      password: sipPassword,
      mediaConstraints: {
        audio: true,
        video: false,
      },
    };
    connectToWS(configuration);
  }

  // Función para cerrar sesión
  function logout() {
    sessions.forEach((session) => {
      if (session) {
        session.terminate();
        addToStatus("Logout", "", "info");
      }
    });
    localStorage.removeItem("server");
    localStorage.removeItem("sipUsername");
    localStorage.removeItem("sipPassword");
    phone.stop();
  }

  // Función para conectar con el WebSocket
  function connectToWS(configuration) {
    if (configuration && configuration.uri && configuration.password) {
      //JsSIP.debug.enable("JsSIP:*"); // more detailed debug output
      phone = new JsSIP.UA(configuration);
      log.setLevel("debug");
      // WebSocket connection events
      phone.on("connecting", function (ev) {
        statusCall("Connectando");
      });
      phone.on("connected", function (ev) {
        statusCall("Connectado");
      });
      phone.on("disconnected", function (ev) {
        statusCall("Desconectado");
      });
      // SIP registration events
      phone.on("unregistered", function (ev) {
        statusCall("sin registrar");
        showLogin();
        $("#status").text("");
        $("#callControl").hide();
      });
      phone.on("registered", function (ev) {
        $("#to").show();
        $("#incomming").hide();
        statusCall("En linea");
        $("#mobile-status-icon")
          .css("color", "green")
          .removeClass("fa-phone-slash")
          .addClass("fa-mobile-retro");
        console.log(configuration.uri, "", "info");
        hideLogin();

        $("#callControl").show();
      });
      phone.on("registrationFailed", function (ev) {
        statusCall("Error en el registro");
        logout();
        updateUI();
      });
      phone.on("newMessage", function (ev) {});
      phone.on("newRTCSession", function (ev) {
        console.log("NewRTCSession", ev, "info");
        var newSession = ev.session;
        // sessions.forEach((existingSession) => {
        //     console.log("NewSession", existingSession, "info");
        //   existingSession.terminate();
        // });
        
        sessions.push(newSession);

        console.log("sessions push ===>", sessions);

        console.log("sess =>", session);
        if (ev.originator === "local") {
          statusCall("Llamada saliente");
        } else {
          statusCall("Llamada entrante");

          document.title = "¡Llamada entrante!";
          const favicon = document.querySelector("link[rel='icon']");
          favicon.href = "assets/images/incomming-call.png";

          notify(
            "!Alerta!",
            "LLamada entrante de: " + ev.session.remote_identity.uri.user
          );
          //mostrar teclado, ocultar vista de contestar llamada
          $("#incomming").show();
          $("#to").hide();
          $("#incommingCallerId").text(ev.session.remote_identity.uri.user);
        }
        // session handlers/callbacks
        let completeSession = function () {
          document.title = "WebRTC - Phone";
          const favicon = document.querySelector("link[rel='icon']");
          favicon.href = "assets/images/favicon.ico";
          sessions = [];
          incomingCallAudio.pause();
          $("#connectCall").attr("disabled", false);
          $("#connectCall").show();
          $("#btnRejectCall").hide();

          $("#phone-options").show();

          $("#callerId").text();
          $("#wrapCallerId").hide();
          $("#optionsInCall").hide();
          $("#info-micro").addClass("align-left");
          //ocultar el input de escribir.
          $(".wrapInputCall").show();
          statusCall("Llamada Finalizada");
          $("#mobile-status-icon")
            .removeClass("fa-mobile-retro")
            .addClass("fa-phone-slash")
            .addClass('fa-square-phone"')
            .css("color", "orange");

          //close transfer popover
          $("#inputExtToTransfer").val("");
          $("#transferPopover").popover("hide");

          //mostrar teclado, ocultar vista de contestar llamada
          $("#to").show();
          $("#incomming").hide();

          setTimeout(function () {
            statusCall("En linea");
            $("#mobile-status-icon")
              .css("color", "green")
              .removeClass("fa-phone-slash")
              .addClass("fa-mobile-retro");
          }, 2000);
          updateUI();

        
          if (mediaRecorder) {
            mediaRecorder.stop();
        }



        };
        console.debug("sessions=>", sessions);
        sessions.forEach((session) => {
          session.on("peerconnection", function (e) {
            statusCall("Conexión Establecida");
          });
          session.on("connecting", function (e) {
            const ext = session.remote_identity.uri.user;
            console.log(ext);
            statusCall("Llamando a: " + ext);
          });
          session.on("process", function (e) {
            statusCall("Procesando Llamada");
          });
          session.on("ended", function (e) {
            statusCall("Llamada Finalizada");
            completeSession();
          });
          session.on("failed", function (e) {
            statusCall("Llamada Fallida");
            $("#mobile-status-icon")
              .removeClass("fa-mobile-retro")
              .addClass("fa-phone-slash")
              .css("color", "red");
            completeSession();
          });
          session.on("accepted", function (e) {
            statusCall("Llamada Aceptada");
            updateUI();
          });
          session.on("confirmed", function (e) {
            statusCall("Llamada Confirmada");
            const localStreams = session.connection.getLocalStreams()[0];
            console.log("Local streams: " + localStreams)
            
            
            statusCall("number of local streams: " + localStreams.length);

            const remoteStreams = session.connection.getRemoteStreams()[0];
            startRecording(remoteStreams)
            
            statusCall("number of remote streams: " + remoteStreams.length);
            updateUI();
            addExtension(session.remote_identity.uri.user);
          });
          session.on("newInfo", function (data) {
            console.log("INFO", data, "warning");
            const customHeader = data.request.getHeader("X-MyCustom-Message");
            console.log("Recibido mensaje personalizado:", customHeader);
          });

          //Llamada entrante.
          if (session.direction === "incoming") {
            //si isDND es true, no entran llamada, estária en modo no molestar
            if (isDND) {
              session.terminate({
                status_code: 486,
                reason_phrase: "DND",
              });
            } else {
              if (isAA) {
                session.answer();
                statusCall("Llamada entrante, aceptando...");
              } else {
                statusCall("¡Llamada entrante!");
                incomingCallAudio.play();
              }
            }
          }
        });
      });
      phone.start();
    }
  }

  //Función que actualiza la vista dependiendo de los cambios que sucedan con la sessión.
  function updateUI() {
    console.log("CONFIGURACION", configuration);
    if (configuration && configuration.uri && configuration.password) {
      $("#wrapLogin").hide();
      $("#wrapper").show();

      if (sessions && sessions.length > 0) {
        sessions.forEach((session) => {
          if (session) {
            console.log("sessions.length", session);
            //statusCall("valid session");
            if (session.isInProgress()) {
              if (session.direction === "incoming" && callTaked == false) {
                statusCall("¡Llamada entrante!");
                $("#incomingCallNumber").html(session.remote_identity.uri);
                //$("#incomingCall").show();
                $("#callControl").hide();
              } else if (
                session.direction === "incoming" &&
                callTaked == true
              ) {
                session.answer(callOptions);
                addStreams();
                deleteRowByUserId(userId);
              } else {
                statusCall("Timbrando...");
                $("#callInfoText").html("Timbrando...");
                $("#mobile-status-icon")
                  .removeClass("fa-phone-slash")
                  .removeClass("fa-mobile-retro")
                  .addClass("fa-phone-volume")
                  .css("color", "green");
                $("#callInfoNumber").html(session.remote_identity.uri.user);
                $("#connectCall").hide();
                $("#btnRejectCall").hide();
                //$("#callStatus").show();
              }
            } else if (session.isEstablished()) {
              statusCall("¡Llamada en progreso!");
              $("#mobile-status-icon")
                .removeClass("fa-phone-slash")
                .addClass("fa-phone-volume")
                .css("color", "green");
              $("#incomingCall").hide();
              $("#phone-options").hide();

              //ocultar el input de escribir.
              $(".wrapInputCall").hide();

              //$("#inCallButtons").show();
              $("#callerId").text(session.remote_identity.uri.user);
              $("#wrapCallerId").show();
              $("#optionsInCall").show();
              $("#info-micro").removeClass("align-left");
              incomingCallAudio.pause();

              $("#connectCall").hide();
              $("#btnRejectCall").show();

              $("#to").show();
              $("#incomming").hide();

              //$("#callControl").hide();
            }
          } else {
            $("#incomingCall").hide();
            $("#callControl").show();
            $("#callStatus").hide();
            $("#inCallButtons").hide();
            incomingCallAudio.pause();
            $("#info-micro").addClass("align-left");
          }
          // Icono de micrófono silenciado
          if (session && session.isMuted().audio) {
            $("#mute i")
              .addClass("fa-microphone-slash")
              .removeClass("fa-microphone");
          } else {
            $("#mute i")
              .removeClass("fa-microphone-slash")
              .addClass("fa-microphone");
          }
        });
      }
    } else {
      $("#wrapper").hide();
      $("#wrapLogin").show();
    }
  }

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

  function statusCall(status) {
    $("#statusCall").html(status);
  }
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

  function addExtension(extension) {
    $("#listExtension").append(
      '<li class="list-group-item">' + extension + "</li>"
    );
  }

  function notify(title, message) {
    if (Notification) {
      if (Notification.permission !== "granted") {
        Notification.requestPermission();
      }
      const extra = {
        icon: "assets/images/incomming-call.png",
        body: message,
      };

      let notification = new Notification(title, extra);
      notification.onclick = function () {
        try {
          window.focus();
        } catch (ex) {}
      };
    }
  }
});
