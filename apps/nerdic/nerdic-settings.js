require("http://localhost/mark/BangleApps/modules/E_showMenu_Q3_mm.js");

//M= //uncomment for tests
(function(back) {
  const BLACK="#000", RED="#f00",GREEN="#0f0",BLUE="#00f",
      YELLOW="#ff0", MAGENTA="#f0f", CYAN="#0ff",WHITE="#fff";
  var SW=g.getWidth();
  var BangleVer = process.env.HWVERSION;

  var FILE = "nerdic.json";
  // Load settings
  var settings = Object.assign({
    hours_color:   (BangleVer==1)?GREEN:WHITE,
    minutes_color: (BangleVer==1)?GREEN:WHITE,
    seconds_color: (BangleVer==1)?GREEN:WHITE,
    hint_duration: 5,
    show_seconds: 2 // 0:never, 1:when unlocked, 2:always
 }, require('Storage').readJSON(FILE, true) || {});

  function writeSettings() {
    require('Storage').writeJSON(FILE, settings);
  }

  function colorToIndex(clr){
    print(clr);
    if(clr.substr(0,1) != '#') return undefined;
    var idx = 0;
    clr = clr.toLowerCase();
    if(clr.length == 4){
      if(clr.substr(1,1)=='f') idx |= 4;
      if(clr.substr(2,1)=='f') idx |= 2;
      if(clr.substr(3,1)=='f') idx |= 1;
      return idx;
    }
    if(clr.length == 7){
      if(clr.substr(1,2)=='ff') idx |= 4;
      if(clr.substr(2,2)=='ff') idx |= 2;
      if(clr.substr(3,2)=='ff') idx |= 1;
      return idx;
    }
  }

  function indexToColor(idx){
    return ((idx&4)?"#f":"#0")
      +((idx&2)?"f":"0")
      +((idx&1)?"f":"0");
  }

  var nerdicMenuItem;

  function colorMenuChange(clr){
    settings[nerdicMenuItem.binding]=clr;
    nerdicMenuItem.value=clr;
    E.showMenu(nerdicMenu);
  }

  function drawCustomItem(val, item, clr, x1,y1, x2, y2){
    //print("drawCustomItem",x1,y1,x2,y2, val, item);
    var c=g.getColor();
    g.setColor(clr);
    g.fillRect(x1+1+120,y1,x2,y2);
    g.setColor(~g.getColor());
    g.setFontAlign(1,-1);
    g.drawString(val,x2-2,y1+1);
    g.setColor(c);
  }

  var colorMenu = {
    "" : {
      "title" : "Colors"
    },
    "Black": {
      value:BLACK,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(BLACK);}
    },
    "Blue": {
      value:BLUE,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(BLUE);}
    },
    "Green": {
      value:GREEN,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(GREEN);}
    },
    "Cyan": {
      value:CYAN,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(CYAN);}
    },
    "Red": {
      value:RED,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(RED);}
    },
    "Magenta": {
      value:MAGENTA,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(MAGENTA);}
    },
    "Yellow": {
      value:YELLOW,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(YELLOW);}
    },
    "White": {
      value:WHITE,
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: () => {colorMenuChange(WHITE);}
    },
  };

var nerdicMenu = {
    "" : { "title" : "Nerdic" },
    "< Back" : () => back(),

    "Hours Color": {
      value: settings.hours_color,
      binding:"hours_color",
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: function(){
        nerdicMenuItem = nerdicMenu["Hours Color"];
        colorMenu[""].selected = colorToIndex(settings.hours_color);
        E.showMenu(colorMenu);
      }
    },

    "Minutes Color" : {
      value: settings.minutes_color,
      binding:"minutes_color",
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: function(){
        nerdicMenuItem = nerdicMenu["Minutes Color"];
        colorMenu[""].selected = colorToIndex(settings.minutes_color);
        E.showMenu(colorMenu);
      }
    },

    "Seconds Color" : {
      value: settings.seconds_color,
      binding:"seconds_color",
      drawItem: (val, item, x1,y1, x2, y2) => drawCustomItem(val, item, item.value, x1,y1, x2, y2),
      onchange: function(){
        nerdicMenuItem = nerdicMenu["Seconds Color"];
        colorMenu[""].selected = colorToIndex(settings.seconds_color);
        E.showMenu(colorMenu);
      }
    },

    'Hint Duration': {
      value: settings.hint_duration,
      min: 0, max: 10,
      onchange: v => {
        settings.hint_duration = v;
        writeSettings();
      }
    },

    "Show sec" : {
    value : settings.show_seconds,
    min:0,max:2,step:1,
    onchange : v => { settings.show_seconds = v; writeSettings(); },
    format : function (v) { 
      switch(v){
        case 0: return "Never";
        case 1: return "Unlocked";
        case 2: return "Always";
      }
     }
    }
  };
 // Show the menu
  E.showMenu(nerdicMenu);
});
//M(load); //uncomment for tests
