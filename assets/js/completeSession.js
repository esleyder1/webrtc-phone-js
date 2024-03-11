function completeSession(extension) {
  document.title = "WebRTC - Phone";
  const favicon = document.querySelector("link[rel='icon']");
  favicon.href = "assets/images/favicon.ico";
  incomingCallAudio.pause();
  $("#connectCall").attr("disabled", false);
  $("#wrapOptions").show();
  $("#connectCall").show();
  $("#btnRejectCall").hide();

  $("#phone-options").show();
  $("#toField").val("");

  $("#callerId").text();
  $("#wrapCallerId").hide();
  $("#wrapTimerId").hide();
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
  $("#info-micro").hide();

  setTimeout(function () {
    statusCall("En linea");
    $("#mobile-status-icon")
      .css("color", "green")
      .removeClass("fa-phone-slash")
      .addClass("fa-mobile-retro");
  }, 2000);
  var foundSession = sessions.find(function (session) {
    return session.remote_identity.uri.user === extension;
  });

  if (foundSession) {
    let listItem = $("#listExtension")
      .find("[data-extension='" + extension + "']")
      .closest(".list-group-item");
      console.log("List",listItem)
    listItem.remove();
    //foundSession.terminate();
  } else {
    console.log("No session found for extension: " + extension);
  }

  addToCallHistory(stateCall);

  stateCall = null;
  stopTimer();
  updateUI();
}


