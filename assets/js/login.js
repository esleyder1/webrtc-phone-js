 /*Login*/
 let loginButton = $("#loginButton");
 let userLabel = $("#user");

 let storedServer = localStorage.getItem("server");
 let storedUsername = localStorage.getItem("sipUsername");
 let storedPassword = localStorage.getItem("sipPassword");

 logContainer = $("#status");
 loginButton = $("#loginButton");
 logoutButton = $("#logoutButton");
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