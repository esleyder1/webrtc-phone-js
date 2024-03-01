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