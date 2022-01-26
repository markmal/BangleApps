(function(back) {
  const RED="#FF0000",GREEN="#00FF00",BLUE="#0000FF",GRAY="#101010",WHITE="#FFFFFF";
  var SW=g.getWidth();
  var BangleVer = (SW==240)?1:(SW==176)?2:0;

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
  
  function indexToColor(idx){
    return ((idx&4)?"#FF":"#00")
      +((idx&2)?"FF":"00")
      +((idx&1)?"FF":"00");
  }
  
  function drawColorItem(idx,r){
    var col=indexToColor(idx);
    //print(idx,col);
    g.reset();
    g.setBgColor("#fff").clearRect(r.x,r.y,r.x+r.w-1,r.y+r.h-1);
    g.setColor("#000").setFont("6x8:2").drawString(col,r.x+10,r.y+6);
    g.setColor(col).fillRect(r.x+100,r.y,r.x+r.w-1,r.y+r.h-1);
  }
  
 var nerdicMenu = {
    "" : { "title" : "Nerdic" },
    "< Back" : () => back(),
    'Hours Color':  () => E.showScroller({
      h:32, c:8,
      draw : (idx, r) => drawColorItem(idx,r),
      select : (idx) => {
        settings.hours_color = indexToColor(idx);
        writeSettings();
        E.showScroller();
        E.showMenu(nerdicMenu);
      }
    }),
    "Minutes Color" : () => E.showScroller({
      h:32, c:8,
      draw : (idx, r) => drawColorItem(idx,r),
      select : (idx) => {
        settings.minutes_color = indexToColor(idx);
        writeSettings();
        E.showScroller();
        E.showMenu(nerdicMenu);
      }
    }),
    "Seconds Color" : () => E.showScroller({
      h:32, c:8,
      draw : (idx, r) => drawColorItem(idx,r),
      select : (idx) => {
        settings.seconds_color = indexToColor(idx);
        writeSettings();
        E.showScroller();
        E.showMenu(nerdicMenu);
      }
    }),

    'Hint Duration': {
      value: 5|settings.hint_duration,  // 0| converts undefined to 0
      min: 0, max: 10,
      onchange: v => {
        settings.hint_duration = v;
        writeSettings();
      }
    }
  };
 // Show the menu
  E.showMenu(nerdicMenu);
})
