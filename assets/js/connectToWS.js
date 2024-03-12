let phone;
let isDND = false;
let isAA = false;
let userRemoteExtension = null;
let loadCallHistoryInit = false;
let causeCall = null;

function statusCall(status) {
  $("#statusCall").html(status);
}
function statusCallConference(extension, status) {
  const foundSession = sessions.find(function (session) {
    return session.remote_identity.uri.user === extension;
  });
  if (foundSession) {
    let listItem = $("#listExtension")
      .find("[data-extension='" + extension + "']")
      .closest(".list-group-item");
    listItem.find("span.dinamicStatusConference").text(status);
  } else {
    console.log("No session found for extension: " + extension);
  }
}
function addExtension(type, extension) {
  var listItem = $("<div>").addClass(
    "list-group-item list-group-item-action flex-column align-items-start call-list-item"
  );
  var content = $("<div>").addClass("d-flex w-100 justify-content-between");
  var nameExtension = $("<div>").addClass("user-conf-extension");

  // Añadir extensión y estado
  nameExtension.append(
    $("<span>")
      .addClass("extension")
      .attr("data-extension", extension)
      .text("Extensión: " + extension)
  );
  nameExtension.append(
    $("<span>")
      .addClass("dinamicStatusConference")
      .text("Estado: " + type)
  );

  content.append(nameExtension);

  // Botón de colgar con icono de Font Awesome
  var hangUpBtn = $("<button>")
    .addClass("hang-up-btn btn btn-danger")
    .html('<i class="fa fa-phone hangup-call"></i>');

  // Agregar evento click al botón para la funcionalidad de colgar
  hangUpBtn.click(function () {
    // Aquí puedes agregar la lógica para colgar la llamada
    console.log("Colgar llamada de ", sessions);

    const foundSession = sessions.find(function (session) {
      return session.remote_identity.uri.user === extension;
    });
    if (foundSession) {
      var listItem = $("#listExtension")
        .find("[data-extension='" + extension + "']")
        .closest(".list-group-item");
      console.log("List", listItem);
      listItem.remove();
      foundSession.terminate();
    } else {
      console.log("No session found for extension: " + extension);
    }

    /* sessions.forEach((session) => {
      session.terminate();
    }); */
  });
  content.append(hangUpBtn);

  // Agregar contenido al elemento de lista
  listItem.append(content);

  // Agregar el elemento de lista al contenedor
  $("#listExtension").append(listItem);

}

function addToCounterConference(){
 
  
  let numberOfElements = $('#listExtension').children().length;
  // Increment the value of the span inside the badge
  let span = $('#counterConference');
  span.text(numberOfElements);
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
        const ext = session.remote_identity.uri.user;
        session.on("peerconnection", function (e) {
          statusCall("Conexión Establecida");
        });
        session.on("connecting", function (e) {
          
          statusCall("Llamando a: " + ext);
          $("#connectCall").animate({
            opacity: 0, // Hacer que la opacidad sea 0 para que desaparezca gradualmente
        },500, function() {
          $("#connectCall").css('opacity',1).hide()
            $("#btnRejectCall").show();
          });
          //$("#btnRejectCall").show();
          statusCallConference(ext,"Llamando...")
        });
        session.on("process", function (e) {
          statusCall("Procesando Llamada");
        });
        session.on("ended", function (e) {
          statusCall("Llamada Finalizada");
         
          statusCallConference(ext,"Llamada finalizada")
          causeCall = e.cause;
          completeSession(ext);
        });
        session.on("failed", function (e) {
          causeCall = e.cause;
          statusCall("Llamada Fallida");
          statusCallConference(ext,"Llamada fallida")
          $("#mobile-status-icon")
            .removeClass("fa-mobile-retro")
            .addClass("fa-phone-slash")
            .css("color", "red");
          setTimeout(() => {
            completeSession(e);
          }, 1000);
        });
        session.on("accepted", function (e) {
          statusCall("Llamada Aceptada");
          statusCallConference(ext,"Llamada aceptada")
          addToCounterConference()
          updateUI();
        });
        session.on("confirmed", function (e) {
          statusCall("Llamada Confirmada");
          const localStreams = session.connection.getLocalStreams()[0];
          statusCall("number of local streams: " + localStreams.length);

          const remoteStreams = session.connection.getRemoteStreams()[0];

          statusCall("number of remote streams: " + remoteStreams.length);
          updateUI();
          //addExtension("Name", session.remote_identity.uri.user);
        });
        session.on("newInfo", function (data) {
          const customHeader = data.request.getHeader("X-MyCustom-Message");
        });

        //Llamada entrante.
        if (session.direction === "incoming") {
          currentNotification = notify(
            "!Alerta!",
            "LLamada entrante de: " + ev.session.remote_identity.uri.user
          );
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
          const ext = session.remote_identity.uri.user;
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
              statusCallConference(ext,"Timbrando...")
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
            $("#dinamicStatusConference").html("¡Llamada en progreso!");
           
            
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
  
            
    
            
            incomingCallAudio.pause();

            $("#wrapOptions").show();
           
            

            $("#to").show();

            $("#incomming").hide();
       
             
              $("#optionsInCall").show();
              $("#wrapCallerId").show();
              $("#wrapTimerId").show();
       
           
            // Iniciar el temporizador
            startTimer();
            $("#info-micro").removeClass("align-left");
            
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
  loadCallHistoryInit = true;

  // Get existing call history from localStorage
  let callHistory = getCallHistory();

  if (Object.keys(callHistory).length === 0) {
    const calltag =
      '<li class="list-group-item text-muted">El historial de llamadas está vacío</li>';
    $("#call-history").html(calltag);
  } else {
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
  } else if (call.type === "call" && call.cause === "Terminated") {
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
  }
  if (call.cause === "Not Found") {
    message = "Realizaste una llamada y no fue encontrado";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
  }
  if (call.cause === "Busy") {
    message = "Realizaste una llamada y estaba ocupado";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
  }
  if (call.cause === "No Answer") {
    message = "Perdiste una llamada";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
  }
  if (call.cause === "Canceled" && call.type === "answer") {
    message = "Llamada entrante, cancelada por el usuario";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
  }
  if (call.cause === "Canceled" && call.type === "call") {
    message = "Llamada saliente, cancelada por el agente";
    icon = '<i class="fas fa-phone-slash"></i>';
    color = "text-danger";
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
  if (call.type !== "reject" && call.cause === "Terminated") {
    calltag +=
      '<span class="call-duration ms-1">y hablaste durante ' +
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

  if (message !== undefined) {
    $("#call-history").prepend(calltag);
  }
  causeCall = null;
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
    user: userRemoteExtension,
    cause: causeCall,
  };
  let callHistory = getCallHistory();
  // Get existing call history from localStorage
  callHistory.push(call);

  // Verificar si el almacenamiento local está vacío
  if (localStorage.getItem("callHistory") === null) {
    $("#call-history").html("");
  }
  localStorage.setItem("callHistory", JSON.stringify(callHistory));
  addCall(call);
}
