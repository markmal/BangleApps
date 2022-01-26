(function(back) {
  var FILE = "nerdic.json";
  // Load settings
  var settings = Object.assign({
    hours_color:   (BangleVer==1)?GREEN:WHITE,
    minutes_color: (BangleVer==1)?GREEN:WHITE,
    seconds_color: (BangleVer==1)?GREEN:WHITE,
    hint_duration: 5
  }, require('Storage').readJSON(FILE, true) || {});

  function writeSettings() {
    require('Storage').writeJSON(FILE, settings);
  }

  // Show the menu
  E.showMenu({
    "" : { "title" : "Nerdic" },
    "< Back" : () => back(),
    'Hours Color': {
      value: "#FFFFFF"|settings.hours_color,  // 0| converts undefined to 0
      min: "#000000", max: "#FFFFFF",
      onchange: v => {
        settings.hours_color = v;
        writeSettings();
      }
    'Hint Duration': {
      value: 5|settings.hint_duration,  // 0| converts undefined to 0
      min: 0, max: 10,
      onchange: v => {
        settings.hint_duration = v;
        writeSettings();
      }
    },
  });
})(load);
