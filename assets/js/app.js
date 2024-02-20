//const socket = io("https://luis.bestvoiper.com:8090");

let logContainer,clearLogButton,userLabel,loginButton,phone,session;
const storedServer = localStorage.getItem("server");
const storedUsername = localStorage.getItem("sipUsername");
const storedPassword = localStorage.getItem("sipPassword");

let callTaked = false
let userId = null

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


let incomingCallAudio = new window.Audio("assets/sounds/ringtone.mp3");
incomingCallAudio.loop = true;
let remoteAudio = new window.Audio();
remoteAudio.autoplay = true;

function add_to_status(message,ev, level){
  let logElement = document.createElement('p');
  logElement.className = level;
  let event = ev!==""?ev:"";
  logElement.textContent = message;
  logContainer.appendChild(logElement);
  logElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function clearLog() {
  logContainer.innerHTML = ''; 
}

function setLogingFromValues(){
  document.getElementById("server").value       = localStorage.getItem("server");
  document.getElementById("sipUsername").value  = localStorage.getItem("sipUsername");
  document.getElementById("sipPassword").value  = localStorage.getItem("sipPassword");
}

function showLogin(){
  document.getElementById("wrapLogin").style.display = "block";
  document.getElementById("wrapper").style.display = "none";
  setLogingFromValues();
}

function hideLogin() {
  document.getElementById("wrapLogin").style.display = "none";
  document.getElementById("wrapper").style.display = "block";
  //document.getElementById("logoutButton").style.display = "block";
}


function transferCall(dest) {
  // Realizar la transferencia de llamada
  console.log("transfer ===============>",session)
  session.refer("sip:" + dest + server, {
    referredBy: "sip:"+sipUsername+"@"+server,
  });
}

function login(server, sipUsername, sipPassword){
  JsSIP.debug.enable("JsSIP:*");
  userLabel.innerText = "sip:" + sipUsername + "@"+server
  // Initialize WebSocket
  const socket = new JsSIP.WebSocketInterface("wss://luis.bestvoiper.com:8089/ws");
  // Configuration with SIP credentials
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

function logout(){
  if(session){
    session.terminate();
    add_to_status("logout", "", "info");
  }
  phone.stop();
}

function connectToWS(configuration) {
  if (configuration && configuration.uri && configuration.password) {
    JsSIP.debug.enable("JsSIP:*"); // more detailed debug output
    phone = new JsSIP.UA(configuration);
    log.setLevel('debug');  
    // WebSocket connection events
    phone.on("connecting", function (ev) {
      add_to_status("Connecting", ev, "info");
    });
    phone.on("connected", function (ev) {
      add_to_status("Connected", ev, "info");
    });
    phone.on("disconnected", function (ev) {
      add_to_status("Disconnected", ev, "error");
    });
    // SIP registration events
    phone.on("unregistered", function (ev) {
      add_to_status("Unregistered", ev, "error");
      showLogin();
      document.getElementById("status").innerText = "";
      document.getElementById("callControl").style.display = "none";
    });
    phone.on("registered", function (ev) {
      add_to_status("Registered", ev, "info");
      add_to_status(configuration.uri, "", "info");
      hideLogin();

      document.getElementById("callControl").style.display = "block";
    });
    phone.on("registrationFailed", function (ev) {
      add_to_status("Registration Failed", ev.cause, "error");
      logout();
      updateUI();
    });
    phone.on("newMessage", function (ev) {

    });
    phone.on("newRTCSession", function (ev) {
      add_to_status("NewRTCSession",ev, "info");
      var newSession = ev.session;
      if (session) {
        // hangup any existing call
        session.terminate();
      }
      session = newSession;
      if (ev.originator === "local") {
        add_to_status("outgoing session", "", "info");
      } else {
        add_to_status("incoming session answering a call", "", "info");
      }
      // session handlers/callbacks
      var completeSession = function () {
        session = null;
        updateUI();
      };

      session.on("peerconnection",(e)=>{
        add_to_status("Session On Peerconnection",e,"info");
      });
      session.on("connecting",(e)=>{
        add_to_status("Session On Connecting",e,"info");
      });
      session.on("process",(e)=>{
        add_to_status("Session On Process",e,"info");
      });
      session.on("ended",(e)=>{
        add_to_status("Session On Ended",e,"info");
        completeSession();
      });
      session.on("failed",(e)=>{
        add_to_status("Session On Failed",e, "error");
        completeSession();
      });
      session.on("accepted",(e)=>{
        add_to_status("Session Accepted",e, "info");
        updateUI();
      });
      session.on("confirmed", function (e) {
        add_to_status("sessionConfirmed",e, "info");
        const localStreams = session.connection.getLocalStreams();
        add_to_status("- number of local streams: "+localStreams.length, "", "info");

        const remoteStreams = session.connection.getRemoteStreams();
        add_to_status("- number of remote streams: "+remoteStreams.length, "", "info");
        updateUI();
      });
      session.on('newInfo', function(data) {
        add_to_status("INFO",data,"warning");
        const customHeader = data.request.getHeader('X-MyCustom-Message');
        console.log('Recibido mensaje personalizado:', customHeader);

      });

      if (session.direction === "incoming") {
        console.log("incoming session direction");
        add_to_status("Incoming session direction", "", "info");
        incomingCallAudio.play();
      }
      updateUI();
    });
    phone.start();
  }
}

function addStreams() {
  session.connection.addEventListener("addstream", function (streamEvent) {
    console.log("addstreams", streamEvent);
    incomingCallAudio.pause();

    //attach remote stream to remoteView
    remoteAudio.srcObject = streamEvent.stream;

    // Attach local stream to selfView
    const peerconnection = session.connection;
  });
}

async function loadQueueInfo() {
    try {
      const response = await fetch('https://luis.bestvoiper.com:8090/queue');
      const data = await response.json();
      console.log("DATA =============>", data)
      // Llama a la función para construir la tabla
      buildQueueTable(data.dispatcherQueueInfo);
    } catch (error) {
      console.error('Error al cargar la información de la cola:', error);
    }
  }


  // Función para construir la tabla con la información de la cola
  function buildQueueTable(queueInfo) {
    // Obtén el contenedor de la tabla
    let tableContainer = document.getElementById('queueInfo');
    let containerTableQueue = document.getElementById('containerTableQueue');
    
    // Crea la tabla y encabezados
    let table = document.createElement('table');
    table.classList.add('table', 'table-striped', 'table-bordered', 'table-sm');
    table.id = 'queueTable';
    let thead = document.createElement('thead');
    thead.classList.add('thead-dark'); 
    let trHead = document.createElement('tr');
    let thChannel = document.createElement('th');
    let thCallerIDNum = document.createElement('th');
    let thPosition = document.createElement('th');
    let thAction = document.createElement('th');
    
    thChannel.textContent = 'Channel';
    thCallerIDNum.textContent = 'Caller ID';
    thPosition.textContent = 'Position';
    thAction.textContent = 'Actions';
    
    thChannel.classList.add('small', 'text-center');
    thCallerIDNum.classList.add('small', 'text-center');
    thPosition.classList.add('small', 'text-center');
    thAction.classList.add('small', 'text-center');

    
    //trHead.appendChild(thChannel);
    trHead.appendChild(thCallerIDNum);
    trHead.appendChild(thPosition);
    trHead.appendChild(thAction);
    
    thead.appendChild(trHead);
    table.appendChild(thead);
    
    // Crea el cuerpo de la tabla
    let tbody = document.createElement('tbody');
    
    // Itera sobre los usuarios en cola
    queueInfo.users.forEach(function(user) {
      let tr = document.createElement('tr');
    
      // Añade las celdas con la información del usuario
      let tdChannel = document.createElement('td');
      let tdCallerIDNum = document.createElement('td');
      let tdPosition = document.createElement('td');
      let tdAction = document.createElement('td');
      
      tdChannel.classList.add('small', 'text-center');
      tdCallerIDNum.classList.add('small', 'text-center');
      tdPosition.classList.add('small', 'text-center');
      tdAction.classList.add('small', 'text-center');
    
      tdChannel.textContent = user.channel;
      tdCallerIDNum.textContent = user.callerIDNum;
      tdPosition.textContent = user.position;
      
      tr.setAttribute('data-user-id', user.callerIDNum);
    
      let returnButton = document.createElement('button');
      returnButton.textContent = 'Call';
      returnButton.classList.add('btn', 'btn-primary', 'btn-sm'); 
      returnButton.addEventListener('click', function() {
        returnButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Calling...';
        const channel = user.channel;
        dequeue(channel);
        userId = tr.getAttribute('data-user-id');
    });
    
      tdAction.appendChild(returnButton);
    
      //tr.appendChild(tdChannel);
      tr.appendChild(tdCallerIDNum);
      tr.appendChild(tdPosition);
      tr.appendChild(tdAction);
    
      tbody.appendChild(tr);
    });
    
    // Agrega el cuerpo de la tabla al elemento de la tabla
    table.appendChild(tbody);
    
    // Limpia el contenedor actual y agrega la nueva tabla
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
    
    //mostrar la sección de la tabla queue
    containerTableQueue.style.display = "block"
  }
  
  function deleteRowByUserId(userId) {
    let table = document.getElementById('queueTable');
    if(userId){
        let rowToDelete = table.querySelector(`tr[data-user-id="${userId}"]`);
        if (rowToDelete) {
            rowToDelete.remove();
            userdId = null
            callTaked = false
        } else {
            console.log(`No row found with userId: ${userId}`);
        }
    }    
  }


  function dequeue(channelId){
    const storedUsername = localStorage.getItem("sipUsername");  
    console.log("username===>",storedUsername)
    const encodedChannelId = encodeURIComponent(channelId);
    fetch(`https://luis.bestvoiper.com:8090/dequeue/${encodedChannelId}/${storedUsername}`, {
      method: "POST",
    })
    .then(response => response.json())
    .then(data => {
      console.log("Dequeue: ",data);
      callTaked = true
    })
    .catch(error => {
      console.error("Error recovering call:", error);
    });
  }

function updateUI() {
  console.log("CONFIGURACION =================>", configuration);
  if (configuration && configuration.uri && configuration.password) {
    document.getElementById("wrapLogin").style.display = "none";
    document.getElementById("wrapper").style.display = "block";
    if (session) {
      console.log("valid session");
      if (session.isInProgress()) {
        if (session.direction === "incoming" && callTaked == false) {
          console.log("inbound call");
          add_to_status("inbound call", "", "info");
          document.getElementById("incomingCallNumber").innerHTML =
            session.remote_identity.uri;
          document.getElementById("incomingCall").style.display = "block";
          document.getElementById("callControl").style.display = "none";
        }
        else if (session.direction === "incoming" && callTaked == true) {
            session.answer(callOptions);
            addStreams();
            deleteRowByUserId(userId)
        }

        else {
          document.getElementById("callInfoText").innerHTML = "Ringing...";
          document.getElementById("callInfoNumber").innerHTML =
            session.remote_identity.uri.user;
          document.getElementById("callStatus").style.display = "block";
        }
      } else if (session.isEstablished()) {
        console.log("session is established.");
        document.getElementById("callStatus").style.display = "block";
        document.getElementById("incomingCall").style.display = "none";
        document.getElementById("callInfoText").innerHTML = "In Call";
        document.getElementById("callInfoNumber").innerHTML =
          session.remote_identity.uri.user;
        document.getElementById("inCallButtons").style.display = "block";
        incomingCallAudio.pause();
      }
      document.getElementById("callControl").style.display = "none";
    } else {
      document.getElementById("incomingCall").style.display = "none";
      document.getElementById("callControl").style.display = "block";
      document.getElementById("callStatus").style.display = "none";
      document.getElementById("inCallButtons").style.display = "none";
      incomingCallAudio.pause();
    }
    // Icono de micr܇fono silenciado
    if (session && session.isMuted().audio) {
      document
        .getElementById("muteIcon")
        .classList.add("fa-microphone-slash");
      document.getElementById("muteIcon").classList.remove("fa-microphone");
    } else {
      document
        .getElementById("muteIcon")
        .classList.remove("fa-microphone-slash");
      document.getElementById("muteIcon").classList.add("fa-microphone");
    }
  } else {
    document.getElementById("wrapper").style.display = "none";
    document.getElementById("wrapLogin").style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  logContainer = document.getElementById('status');
  userLabel = document.getElementById("user");
  clearLogButton = document.getElementById("clearLogButton");
  loginButton = document.getElementById("loginButton");
  logoutButton = document.getElementById("logoutButton");

  let configuration = null;

  if (storedServer && storedUsername && storedPassword) {
    login(storedServer,storedUsername,storedPassword)
    //cambiar a block si se quiere mostrar el log card
    document.getElementById("containerStatus").style.display = "none";
  }else{
    showLogin()
  }


  clearLogButton.addEventListener("click",clearLog);
  loginButton.addEventListener("click",()=>{
    const server = document.getElementById("server").value;
    const sipUsername = document.getElementById("sipUsername").value;
    const sipPassword = document.getElementById("sipPassword").value;

    localStorage.setItem("server", server);
    localStorage.setItem("sipUsername", sipUsername);
    localStorage.setItem("sipPassword", sipPassword);

    login(server,sipUsername,sipPassword)
    //document.getElementById("containerStatus").style.display = "block";
  });
  

  document.getElementById("revealPassword").addEventListener("click",()=>{
    var passwordInput = document.getElementById("sipPassword");
    var toggleIcon = document.querySelector(".toggle-password i");
    if(passwordInput.type === "password") {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash");
    }else{
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye");
    }
  });

  //logoutButton.addEventListener("click",logout);
  
  document.getElementById("toCallButtons").addEventListener("click", (e) => {
    if (e.target.classList.contains("dialpad-char")) {
      let digit = e.target.getAttribute("data-value");
      if (digit == "#") { digit = "pound"; }
      if (digit == "*") { digit = "star"; }
      let audio = new Audio("assets/sounds/dtmf/dtmf-" + digit + ".mp3");
      audio.play();
      document.getElementById("wrapOptions").style.display = "block";
      
      document.getElementById("toField").value += digit      
      console.log("session =====================>", session);
      //session.sendDTMF(value.toString());
      add_to_status(digit.toString(), "", "info");
    }
  });

  document.getElementById("btnDeleteDial").addEventListener("click",() =>{
    const toField = document.getElementById('toField');
    toField.value = toField.value.slice(0, -1);
    console.log("input =>", toField.value)
    if(toField.value ===""){
        document.getElementById("wrapOptions").style.display = "none";
    }
  });

  document.getElementById("connectCall").addEventListener("click",() =>{
    const dest = document.getElementById("toField").value;

    const cbListen = document.getElementById("spyCheckboxListen");
    const cbTalk = document.getElementById("spyCheckboxTalk");
    const connectCall = document.getElementById("connectCall");


    phone.call(dest, callOptions); 
    console.log("Calling");
    
    
    document.getElementById("toField").value = ""

    updateUI();
    addStreams();
  });
  
  document.getElementById("answer").addEventListener("click",()=>{
    add_to_status("Hold", "", "info");

    session.answer(callOptions);
    addStreams();
  });

  const hangup = () => {
    session.terminate();
  };

  document.getElementById("hangUp").addEventListener("click", hangup);
  document.getElementById("reject").addEventListener("click", hangup);

  document.getElementById("mute").addEventListener("click",()=>{
    console.log("MUTE CLICKED");
    add_to_status("MUTE CLICKED", "", "info");
    if (session.isMuted().audio) {
      session.unmute({
        audio: true,
      });
    } else {
      session.mute({
        audio: true,
      });c
    }
    updateUI();
  });

  document.getElementById("btnHoldUnhold").addEventListener("click",()=>{
    console.log("status ================>", session.isOnHold().local);
    if (!session.isOnHold().local) {
      session.hold();
      add_to_status("Hold", "", "info");
      document.getElementById("btnHoldUnhold").innerText = "Quitar de espera";
      document.getElementById("btnHoldUnhold").style.backgroundColor = "#32CD32";
    } else {
      session.unhold();
      add_to_status("unHold", "", "info");
      document.getElementById("btnHoldUnhold").innerText = "Poner en espera";
      document.getElementById("btnHoldUnhold").style.backgroundColor = "#4285F4";
    }
    updateUI();
  });
  
    document.getElementById("btnTransferCall").addEventListener("click",()=>{
        transferCall('700')
        add_to_status('Parkint to 700', "", "info")
    });

  document.getElementById("toField").addEventListener("keypress",(e)=>{
    if (e.which === 13) {
      // Enter
      document.getElementById("connectCall").click();
    }
  });

  

});
