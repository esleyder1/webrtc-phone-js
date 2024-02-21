jQuery(function () {
    let loginButton = $('#loginButton');
    let userLabel = $('#user');

    let storedServer = localStorage.getItem("server");
    let storedUsername = localStorage.getItem("sipUsername");
    let storedPassword = localStorage.getItem("sipPassword");

    let audioFiles = {};
    let session = [];
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
                video: false
            }
        },
        rtcOfferConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
        },
        pcConfig: {
            iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
            iceTransportPolicy: "all"
        }
    };

    let incomingCallAudio = new Audio("assets/sounds/ringtone.mp3");
    incomingCallAudio.loop = true;
    let remoteAudio = new Audio();
    remoteAudio.autoplay = true;

    function addStreams() {
        session.connection.addEventListener("addstream", function (streamEvent) {
            console.log("addstreams", streamEvent);
            incomingCallAudio.pause();

            //attach remote stream to remoteView
            remoteAudio.srcObject = streamEvent.stream;

            // Attach local stream to selfView
            const peerconnection = session.connection;
            console.log(
            "addstream peerconnection local and remote stream counts ",
            peerconnection.getLocalStreams.length,
            peerconnection.getRemoteStreams.length
            );
        });
    }

    // Función para mostrar el formulario de inicio de sesión
    function showLogin() {
        $('#wrapLogin').show()
        $('#wrapper').hide()
        setLoginFromValues();
    }

    // Función para ocultar el formulario de inicio de sesión
    function hideLogin() {
        $('#wrapLogin').hide()
        $('#wrapper').show()
    }

    // Función para establecer los valores del formulario de inicio de sesión desde el almacenamiento local
    function setLoginFromValues() {
        $('#server').val(storedServer);
        $('#sipUsername').val(storedUsername);
        $('#sipPassword').val(storedPassword);
    }

    // Función para realizar la transferencia de llamada
    function transferCall(dest) {
        console.log("Transfer", session);
        session.refer("sip:" + dest + server, {
            referredBy: "sip:" + sipUsername + "@" + server
        });
    }

    // Función para iniciar sesión
    function login(server, sipUsername, sipPassword) {
        JsSIP.debug.enable("JsSIP:*");
        userLabel.text("sip:" + sipUsername + "@" + server);
        const socket = new JsSIP.WebSocketInterface(`wss://${server}:8089/ws`)
        configuration = {
            sockets: [socket],
            uri: "sip:" + sipUsername + "@" + server,
            password: sipPassword,
            mediaConstraints: {
                audio: true,
                video: false
            }
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
            log.setLevel('debug');
            // WebSocket connection events
            phone.on("connecting", function(ev) {
                console.log("Connecting", ev, "info");
            });
            phone.on("connected", function(ev) {
                console.log("Connected", ev, "info");
            });
            phone.on("disconnected", function(ev) {
                console.log("Disconnected", ev, "error");
            });
            // SIP registration events
            phone.on("unregistered", function(ev) {
                console.log("Unregistered", ev, "error");
                showLogin();
                $('#status').text("");
                $('#callControl').hide()
            });
            phone.on("registered", function(ev) {
                console.log("Registered", ev, "info");
                console.log(configuration.uri, "", "info");
                hideLogin();
    
                $('#callControl').show()
            });
            phone.on("registrationFailed", function(ev) {
                console.log("Registration Failed", ev.cause, "error");
                logout();
                updateUI();
            });
            phone.on("newMessage", function(ev) {
    
            });
            phone.on("newRTCSession", function(ev) {
                console.log("NewRTCSession", ev, "info");
                var newSession = ev.session;
                if (session) {
                    // hangup any existing call
                    session.terminate();
                }
                session = newSession;
                console.log("sess =>",session)
                if (ev.originator === "local") {
                    console.log("outgoing session", "", "info");
                } else {
                    console.log("incoming session answering a call", "", "info");
                }
                // session handlers/callbacks
                var completeSession = function() {
                    session = null;
                    updateUI();
                };
    
                session.on("peerconnection", function(e) {
                    console.log("Session On Peerconnection", e, "info");
                });
                session.on("connecting", function(e) {
                    console.log("Session On Connecting", e, "info");
                });
                session.on("process", function(e) {
                    console.log("Session On Process", e, "info");
                });
                session.on("ended", function(e) {
                    console.log("Session On Ended", e, "info");
                    completeSession();
                });
                session.on("failed", function(e) {
                    console.log("Session On Failed", e, "error");
                    completeSession();
                });
                session.on("accepted", function(e) {
                    console.log("Session Accepted", e, "info");
                    updateUI();
                
                });
                session.on("confirmed", function(e) {
                    console.log("sessionConfirmed", e, "info");
                    const localStreams = session.connection.getLocalStreams()[0];
                    console.log("- number of local streams: " + localStreams.length, "", "info");
    
                    const remoteStreams = session.connection.getRemoteStreams();
                    console.log("- number of remote streams: " + remoteStreams.length, "", "info");
                    updateUI();

                   
                    
                    
                });
                session.on('newInfo', function(data) {
                    console.log("INFO", data, "warning");
                    const customHeader = data.request.getHeader('X-MyCustom-Message');
                    console.log('Recibido mensaje personalizado:', customHeader);
    
                });
    
                if (session.direction === "incoming") {
                    //si isDND es true, no entran llamada, estária en modo no molestar
                    if(isDND){
                        session.terminate({
                            status_code: 486,
                            reason_phrase: 'DND'
                          });
                    }else{
                        if(isAA){
                            session.answer()
                        }else{
                            console.log("incoming session direction");
                            incomingCallAudio.play();
                        }
                    }
                }
                updateUI();
            });
            phone.start();
        }
    }

    function updateUI() {
        console.log("CONFIGURACION", configuration);
        if (configuration && configuration.uri && configuration.password) {
            $("#wrapLogin").hide();
            $("#wrapper").show();
            if (session) {
                console.log("valid session");
                if (session.isInProgress()) {
                    if (session.direction === "incoming" && callTaked == false) {
                        console.log("inbound call");
                        console.log("inbound call", "", "info");
                        $("#incomingCallNumber").html(session.remote_identity.uri);
                        $("#incomingCall").show();
                        $("#callControl").hide();
                    } else if (session.direction === "incoming" && callTaked == true) {
                        session.answer(callOptions);
                        addStreams();
                        deleteRowByUserId(userId);
                    } else {
                        $("#callInfoText").html("Timbrando...");
                        $("#callInfoNumber").html(session.remote_identity.uri.user);
                        $("#callStatus").show();
                    }
                } else if (session.isEstablished()) {
                    console.log("session is established.");
                    $("#callStatus").show();
                    $("#incomingCall").hide();
                    $("#callInfoText").html("En llamada");
                    $("#callInfoNumber").html(session.remote_identity.uri.user);
                    $("#inCallButtons").show();
                    incomingCallAudio.pause();
                }
                $("#callControl").hide();
            } else {
                $("#incomingCall").hide();
                $("#callControl").show();
                $("#callStatus").hide();
                $("#inCallButtons").hide();
                incomingCallAudio.pause();
            }
            // Icono de micrófono silenciado
            if (session && session.isMuted().audio) {
                $("#muteIcon").addClass("fa-microphone-slash").removeClass("fa-microphone");
            } else {
                $("#muteIcon").removeClass("fa-microphone-slash").addClass("fa-microphone");
            }
        } else {
            $("#wrapper").hide();
            $("#wrapLogin").show();
        }
    }

    logContainer = $('#status');
    userLabel = $("#user");
    loginButton = $("#loginButton");
    logoutButton = $("#logoutButton");

    let configuration = null;

    if (storedServer && storedUsername && storedPassword) {
        login(storedServer, storedUsername, storedPassword);
        //cambiar a block si se quiere mostrar el log card
        $("#containerStatus").hide();
    } else {
        showLogin();
    }

    loginButton.on("click", function() {
        const server = $("#server").val();
        const sipUsername = $("#sipUsername").val();
        const sipPassword = $("#sipPassword").val();

        localStorage.setItem("server", server);
        localStorage.setItem("sipUsername", sipUsername);
        localStorage.setItem("sipPassword", sipPassword);

        login(server, sipUsername, sipPassword);
        //document.getElementById("containerStatus").style.display = "block";
    });

    $("#revealPassword").on("click", function() {
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

    $('#btnLogout').click(function(event) {
        event.preventDefault();
        logout()
    })

    $("#toCallButtons").on("click", ".dialpad-char", function(e) {
        if ($(this).hasClass("dialpad-char")) {
            let digit = $(this).attr("data-value");
            
            if (digit == "#") { digit = "pound"; }
            if (digit == "*") { digit = "star"}
            if (audioFiles[digit]) {
                if (lastPlayedAudio) {
                    // Detiene la reproducción del archivo de audio anterior si aún está reproduciéndose
                    lastPlayedAudio.pause();
                    lastPlayedAudio.currentTime = 0;
                }
                audioFiles[digit].play();
                lastPlayedAudio = audioFiles[digit]; // Actualiza el último archivo de audio reproducido
          
            
            } else {
                console.error("El archivo de audio para el dígito " + digit + " no está disponible.");
            }
            
            if (digit == "pound") { digit = "#"; }
            if (digit == "star") { digit = "*"; }

            $("#wrapOptions").show();
            $("#toField").val($("#toField").val() + digit);
            console.log(digit.toString(), "", "info");
        }
    });

    $("#inCallButtons").on("click", ".dialpad-char", function(e) {
        if ($(this).hasClass("dialpad-char")) {
            let digit = $(this).attr("data-value");
            session.sendDTMF(digit)
        }
    });

    let lastPlayedAudio = null;

    // Función para cargar los archivos de audio DTMF
    function loadAudioFiles() {
        let digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "pound", "star"];
        digits.forEach(function(digit) {
            let audioSrc = "assets/sounds/dtmf/" + digit + ".mp3";
            audioFiles[digit] = new Audio(audioSrc);
            audioFiles[digit].addEventListener('ended', function() {
                lastPlayedAudio = null;
            });
        });
    }
    

    loadAudioFiles();

    $("#btnDeleteDial").on("click", function() {
        const toField = $("#toField");
        toField.val(toField.val().slice(0, -1));
        if (toField.val() === "") {
            $("#wrapOptions").hide();
        }
    });

    $("#connectCall").on("click", function() {
        const dest = $("#toField").val();

        phone.call(dest, callOptions);
        console.log("Calling");

        $("#toField").val("");

        updateUI();
        addStreams();
    });

    $("#answer").on("click", function() {
        console.log("Hold", "", "info");

        session.answer(callOptions);
        addStreams();
    });

    const hangup = () => {
        session.terminate();
    };

    $("#hangUp").on("click", hangup);
    $("#reject").on("click", hangup);

    $("#mute").on("click", function() {
        console.log("MUTE CLICKED");
        console.log("MUTE CLICKED", "", "info");
        if (session.isMuted().audio) {
            session.unmute({
                audio: true,
            });
        } else {
            session.mute({
                audio: true,
            });
        }
        updateUI();
    });

    $("#btnHoldUnhold").on("click", function() {
        console.log("status", session.isOnHold().local);
        if (!session.isOnHold().local) {
            session.hold();
            console.log("Hold", "", "info");
            $("#btnHoldUnhold").text("Quitar de espera");
            $("#btnHoldUnhold").css("background-color", "#32CD32");
        } else {
            session.unhold();
            console.log("unHold", "", "info");
            $("#btnHoldUnhold").text("Poner en espera");
            $("#btnHoldUnhold").css("background-color", "#4285F4");
        }
        updateUI();
    });

    $("#btnTransferCall").on("click", function() {
        transferCall('700');
        console.log('Parkint to 700', "", "info");
    });

    $("#toField").on("keypress", function(e) {
        if (e.which === 13) {
            // Enter
            $("#connectCall").click();
        }
    });

    $('#btnDND').click(function(event) {
        event.preventDefault();
        if(isDND){
            isDND = false
            $(this).find("span").text("No Molestar")
        }else{
            isDND = true
            $(this).find("span").text("No Molestar | Activado")
        }
    });

    $('#btnAA').click(function(event) {
        event.preventDefault();
        if(isAA){
            isAA = false
            $(this).find("span").text("Respuesta Automática")
        }else{
            isAA = true
            $(this).find("span").text("Respuesta Automática | Activado")
        }
    });

})    