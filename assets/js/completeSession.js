function completeSession() {
    document.title = "WebRTC - Phone";
    const favicon = document.querySelector("link[rel='icon']");
    favicon.href = "assets/images/favicon.ico";
    sessions = [];
    incomingCallAudio.pause();
    $("#connectCall").attr("disabled", false);
    $("#connectCall").show();
    $("#btnRejectCall").hide();

    $("#phone-options").show();
    $('#toField').val('');

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
    $('#info-micro').hide()

    setTimeout(function () {
      statusCall("En linea");
      $("#mobile-status-icon")
        .css("color", "green")
        .removeClass("fa-phone-slash")
        .addClass("fa-mobile-retro");
    }, 2000);

    stopTimer()

    updateUI();
  };