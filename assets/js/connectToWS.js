let phone;
let isDND = false;
let isAA = false;
let userRemoteExtension = null;
let loadCallHistoryInit = false;

function statusCall(status) {
  $("#statusCall").html(status);
}
function addExtension(extension) {
  $("#listExtension").append(
    '<li class="list-group-item">' + extension + "</li>"
  );
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
      hideLogin();
      loadCallHistory();

      $("#callControl").show();
    });
    phone.on("registrationFailed", function (ev) {
      statusCall("Error en el registro");
      logout();
      updateUI();
    });
    phone.on("newMessage", function (ev) {});
    phone.on("newRTCSession", function (ev) {
      var newSession = ev.session;

      sessions.push(newSession);
      userRemoteExtension = ev.session.remote_identity.uri.user;
      if (ev.originator === "local") {
        statusCall("Llamada saliente");
      } else {
        statusCall("Llamada entrante");

        document.title = "¡Llamada entrante!";
        const favicon = document.querySelector("link[rel='icon']");
        favicon.href = "assets/images/incomming-call.png";

        currentNotification = notify(
          "!Alerta!",
          "LLamada entrante de: " + ev.session.remote_identity.uri.user
        );
        $("#connectCall").hide();
        //mostrar teclado, ocultar vista de contestar llamada
        $("#incomming").show();
        $("#to").hide();
        $("#incommingCallerId").text(ev.session.remote_identity.uri.user);
      }
      // session handlers/callbacks
      sessions.forEach((session) => {
        session.on("peerconnection", function (e) {
          statusCall("Conexión Establecida");
        });
        session.on("connecting", function (e) {
          const ext = session.remote_identity.uri.user;
          statusCall("Llamando a: " + ext);
          $("#btnRejectCall").show();
        });
        session.on("process", function (e) {
          statusCall("Procesando Llamada");
        });
        session.on("ended", function (e) {
          statusCall("Llamada Finalizada");

          completeSession();
        });
        session.on("failed", function (e) {
          console.log("Event", e);
          statusCall("Llamada Fallida");
          $("#mobile-status-icon")
            .removeClass("fa-mobile-retro")
            .addClass("fa-phone-slash")
            .css("color", "red");
          setTimeout(() => {
            completeSession();
          }, 1000);
        });
        session.on("accepted", function (e) {
          statusCall("Llamada Aceptada");
          updateUI();
        });
        session.on("confirmed", function (e) {
          statusCall("Llamada Confirmada");
          const localStreams = session.connection.getLocalStreams()[0];
          statusCall("number of local streams: " + localStreams.length);

          const remoteStreams = session.connection.getRemoteStreams()[0];

          statusCall("number of remote streams: " + remoteStreams.length);
          updateUI();
          addExtension(session.remote_identity.uri.user);
        });
        session.on("newInfo", function (data) {
          const customHeader = data.request.getHeader("X-MyCustom-Message");
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
  if (configuration && configuration.uri && configuration.password) {
    $("#wrapLogin").hide();
    $("#wrapper").show();

    if (sessions && sessions.length > 0) {
      sessions.forEach((session) => {
        if (session) {
          //statusCall("valid session");
          if (session.isInProgress()) {
            if (session.direction === "incoming" && callTaked == false) {
              statusCall("¡Llamada entrante!");

              $("#incomingCallNumber").html(session.remote_identity.uri);
              //$("#incomingCall").show();
              $("#callControl").hide();
            } else if (session.direction === "incoming" && callTaked == true) {
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

            // Iniciar el temporizador
            startTimer();
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
            $("#wrapTimerId").show();
            $("#optionsInCall").show();
            $("#info-micro").removeClass("align-left");
            incomingCallAudio.pause();

            $("#wrapOptions").show();
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

function loadCallHistory() {

  loadCallHistoryInit = true

  // Get existing call history from localStorage
  let callHistory = getCallHistory();

  if (Object.keys(callHistory).length === 0) {
    const calltag = '<li class="list-group-item text-muted">El historial de llamadas está vacío</li>';
    $("#call-history").html(calltag);
  }else{
    callHistory.forEach(function (call) {
      addCall(call);
    });
  }

 
}

function formatDuration(seconds) {
  var minutes = Math.floor(seconds / 60);
  var remainingSeconds = seconds % 60;
  var duration = "";
  if (minutes > 0) {
    duration += minutes + "m ";
  }
  duration += remainingSeconds + "s";
  return duration;
}

function addCall(call) {
  let message;
  let icon;
  let color;
  if (call.type === "answer") {
    message = "Recibiste una llamada";
    icon = '<i class="fas fa-phone-alt"></i>';
    color = "text-success";
  } else if (call.type === "call") {
    message = "Realizaste una llamada";
    icon = '<i class="fas fa-phone"></i>';
    color = "text-primary";
  } else if (call.type === "hangup") {
    message = "Colgaste una llamada";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
  } else if (call.type === "reject") {
    message = "Rechazaste una llamada";
    icon = '<i class="fas fa-times-circle"></i>';
    color = "text-warning";
  } else {
    message = "Intentaste hacer una llamada de audio (Request Terminated)";
    icon = '<i class="fas fa-question-circle"></i>';
    color = "text-muted";
  }

  // Obtener la hora de la llamada
  let callTime;
  if (call.timestamp instanceof Date && !isNaN(call.timestamp)) {
    callTime = call.timestamp;
  } else {
    // Si no es válido, usar la fecha y hora actual
    callTime = new Date();
  }
  let currentTime = new Date();
  let formattedTime;
  if (callTime.toDateString() === currentTime.toDateString()) {
    formattedTime = callTime.toLocaleTimeString("en-US");
  } else {
    formattedTime =
      "ayer a las " +
      callTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
  }

  var calltag =
    '<li class="list-group-item call-item d-flex align-items-center">' +
    '<span class="call-icon me-3 ' +
    color +
    '">' +
    icon +
    "</span>" +
    '<span class="call-message flex-grow-1">' +
    message;

  // Agregar duración solo si no es una llamada rechazada
  if (call.type !== "reject") {
    calltag +=
      '<span class="call-duration ms-2">y hablaste durante ' +
      formatDuration(call.duration) +
      "</span>";
  }
  // Agregar el usuario remoto
  calltag +=
    '<div><span class="call-user"><i class="fas fa-user me-1"></i>' +
    call.user +
    "</span></div>";

  // Agregar la hora de la llamada
  calltag +=
    '<div><span class="call-time"><i class="fas fa-clock me-1"></i>' +
    formattedTime +
    "</span></div>";

  calltag += "</span>" + "</li>";

  $("#call-history").prepend(calltag);
  
  
}

function getCallHistory() {
  return JSON.parse(localStorage.getItem("callHistory")) || [];
}

// Function to add a call to the call history
function addToCallHistory(type) {
  //type = 'answer','call,'hangup','reject'
  // Create a call object with current timestamp
  
  let call = {
    type: type,
    duration: callDuration,
    timestamp: new Date(),
    icon: "",
    user: userRemoteExtension
  };
  let callHistory = getCallHistory(); 
  // Get existing call history from localStorage
  console.log(callHistory)
  callHistory.push(call);

  // Verificar si el almacenamiento local está vacío
if (localStorage.getItem("callHistory") === null) {
  $("#call-history").html("")
}
  localStorage.setItem("callHistory", JSON.stringify(callHistory));
  addCall(call);
}
