jQuery(function () {
  let loginButton = $("#loginButton");
  let userLabel = $("#user");

  let storedServer = localStorage.getItem("server");
  let storedUsername = localStorage.getItem("sipUsername");
  let storedPassword = localStorage.getItem("sipPassword");

  logContainer = $("#status");
  userLabel = $("#user");
  loginButton = $("#loginButton");
  logoutButton = $("#logoutButton");
  var options = {
    html: true,
    title: "Transferir llamada",
    //html element
    //content: $("#popover-content")
    content: $('[data-name="popover-content"]')
    //Doing below won't work. Shows title only
    //content: $("#popover-content").html()
}
var exampleEl = document.getElementById('example')
new bootstrap.Popover(exampleEl, options)


  $('#callButton').click(function() {
    // Aquí puedes agregar la lógica para realizar la llamada
    var texto = $('#inputField').val();
    console.log('Texto ingresado:', texto);
    
    // Cierra el popover después de hacer clic en el botón de llamar
    $('#customPopover').hide();
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

  function addStreams() {
    sessions.forEach((session) => {
      session.connection.addEventListener("addstream", function (streamEvent) {
        console.log("addstreams", streamEvent);
        incomingCallAudio.pause();

        // Attach remote stream to remoteView
        remoteAudio.srcObject = streamEvent.stream;

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
    if (session) {
      session.terminate();
      addToStatus("Logout", "", "info");
    }
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
        statusCall("En linea");
        console.log(configuration.uri, "", "info");
        hideLogin();

        $("#callControl").show();
      });
      phone.on("registrationFailed", function (ev) {
        statusCall("Registration Failed");
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
        console.log("sess =>", session);
        if (ev.originator === "local") {
          statusCall("Llamada saliente");
        } else {
          statusCall("Llamada entrante");
        }
        // session handlers/callbacks
        var completeSession = function () {
          session = null;
          updateUI();
        };
        console.debug("sessions=>", sessions);
        sessions.forEach((session) => {
          session.on("peerconnection", function (e) {
            statusCall("Conexión Establecida");
          });
          session.on("connecting", function (e) {
            const regex = /sip:(\d+)@/;
            const to = e.request.headers.To[0];
            const ext = to.match(regex)[1];
            console.log(ext);
            statusCall("Llamando a: "+ ext);
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
            completeSession();
          });
          session.on("accepted", function (e) {
            statusCall("Llamada Aceptada");
            updateUI();
          });
          session.on("confirmed", function (e) {
            statusCall("Llamada Confirmada");
            const localStreams = session.connection.getLocalStreams()[0];
            statusCall("number of local streams: " + localStreams.length);

            const remoteStreams = session.connection.getRemoteStreams();
            statusCall("number of remote streams: " + remoteStreams.length);
            updateUI();
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
        updateUI();
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
      sessions.forEach((session) => {
        if (session) {
          //statusCall("valid session");
          if (session.isInProgress()) {
            if (session.direction === "incoming" && callTaked == false) {
              statusCall("¡Llamada entrante!");
              $("#incomingCallNumber").html(session.remote_identity.uri);
              //$("#incomingCall").show();
              //$("#callControl").hide();
            } else if (session.direction === "incoming" && callTaked == true) {
              session.answer(callOptions);
              addStreams();
              deleteRowByUserId(userId);
            } else {
              statusCall("Timbrando...")
              $("#callInfoText").html("Timbrando...");
              $("#callInfoNumber").html(session.remote_identity.uri.user);
              //$("#callStatus").show();
            }
          } else if (session.isEstablished()) {
            statusCall("¡Llamada establecida!");
            $("#callStatus").show();
            $("#incomingCall").hide();
            $("#callInfoText").html("En llamada");
            $("#callInfoNumber").html(session.remote_identity.uri.user);
            $("#inCallButtons").show();
            incomingCallAudio.pause();
          }
          //$("#callControl").hide();
        } else {
          $("#incomingCall").hide();
          $("#callControl").show();
          $("#callStatus").hide();
          $("#inCallButtons").hide();
          incomingCallAudio.pause();
        }
        // Icono de micrófono silenciado
        if (session && session.isMuted().audio) {
          $("#muteIcon")
            .addClass("fa-microphone-slash")
            .removeClass("fa-microphone");
        } else {
          $("#muteIcon")
            .removeClass("fa-microphone-slash")
            .addClass("fa-microphone");
        }
      });
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
  loginButton.on("click", function () {
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
      console.log(digit.toString(), "", "info");
    }
  });

  $("#inCallButtons").on("click", ".dialpad-char", function (e) {
    if ($(this).hasClass("dialpad-char")) {
      let digit = $(this).attr("data-value");
      //session.sendDTMF(digit);
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
    statusCall("Calling");
    phone.call(dest, callOptions);

    $("#toField").val("");

    updateUI();
    addStreams();
  });

  //Función para responder la llamada
  $("#answer").click(function () {
    sessions.forEach((session) => {
      console.log("Hold", "", "info");
      session.answer(callOptions);
      addStreams();
    });
  });


  //funcion para colgar la llamada
  $("#reject", "#hangUp").click(function(){
    sessions.forEach((session) => {
        session.terminate();
    })    
  })

  //Función que habilita el modo - Mute de la llamada.
  $("#mute").on("click", function () {
    console.log("MUTE CLICKED");
    sessions.forEach((session) => {
        if (session.isMuted().audio) {
        session.unmute({
            audio: true,
        });
        $(this).find('i').removeClass("fa-microphone-slash").addClass("fa-microphone");
        $(this).removeClass('btn-light').addClass("btn-success")
        } else {
        session.mute({
            audio: true,
        });
        $(this).find('i').removeClass("fa-microphone").addClass("fa-microphone-slash");
        $(this).removeClass('btn-light').addClass("btn-success")
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
        $(this).find('i').removeClass("fa-circle-pause").addClass("fa-circle-play");
        $(this).removeClass('btn-light').addClass("btn-success")
        } else {
        session.unhold();
        console.log("unHold", "", "info");
        $(this).find('i').removeClass("fa-circle-play").addClass("fa-circle-pause");
        $(this).removeClass('btn-success').addClass("btn-light")
        }
    });
    updateUI();
  });

  // Función para realizar la transferencia de llamada
  $("#btnTransferCall").click(function(){
    console.log("Transfer", session);
    session.refer("sip:" + dest + server, {
      referredBy: "sip:" + sipUsername + "@" + server,
    });
    $(this).find('i').removeClass("fa-circle-play").addClass("fa-circle-pause");
    $(this).removeClass('btn-success').addClass("btn-light")
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
    } else {
      isDND = true;
      $(this).find("span").text("No Molestar | Activado");
    }
  });

  //Función que habilita 
  $("#btnAA").click(function (event) {
    event.preventDefault();
    if (isAA) {
      isAA = false;
      $(this).find("span").text("Respuesta Automática");
    } else {
      isAA = true;
      $(this).find("span").text("Respuesta Automática | Activado");
    }
  });
});
