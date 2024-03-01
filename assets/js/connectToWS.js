let phone;
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
          $("#connectCall").hide();
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
            console.log("Local streams: " + localStreams);
            statusCall("number of local streams: " + localStreams.length);

            const remoteStreams = session.connection.getRemoteStreams()[0];

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