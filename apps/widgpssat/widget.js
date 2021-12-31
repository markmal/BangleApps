//WIDGETS={}; // for development only

// This is for testing in emulator
/*
isTestGPSpower=false;
isTestGPSfix=false;

function testGPSFix() {
  return {
  "lat": 43.6364044+(Math.random()-0.5)*0.0001,      // Latitude in degrees
  "lon": -79.347+(Math.random()-0.5)*0.0001,      // Longitude in degrees
  "alt": Math.random()*1,      // altitude in M
  "speed": 30+(Math.random()-0.5)*10,    // Speed in kph
  "course": 90+(Math.random()-0.5)*20,   // Course in degrees
  "time": Date.now(),       // Current Time (or undefined if not known)
  "satellites": Math.round(Math.random()*20),    // Number of satellites
  "fix": (Math.random() > 0.1 ) ? 1 : 0,            // NMEA Fix state - 0 is no fix
  "hdop": Math.random()*10     // Horizontal Dilution of Precision
  }
}
*/

// GPS Sat Widget
(() => {

  var SatClear = {
    width : 24, height : 24, bpp : 3,
    transparent : 1,
    buffer : require("heatshrink").decompress(atob("kmSpIFFAQNIBAUEBAgFBAQQISEAgmFoAIDCgYIYFhBQaOhSGIARFIAoQaEhJNBoEkiQIBwQFBgALByAIByBfCMoOCDQUBCIUgDQRQJpMggAUBAoI"))
  };
  var SatGreen = {
    width : 24, height : 24, bpp : 3,
    transparent : 1,
    buffer : require("heatshrink").decompress(atob("kmSpIFFAQNIBAUEBAkN23YBCggCBAQFE4AICgICBBDQsIKDR0KQxACIpAFCDQkJgGSoEkiQIBwQFBgALByAIByA1BCIMEwQaCgIRCkAaCFgIpBAQQ4DkEACgIFBA"))
  };

  var SatRed = {
    width : 24, height : 24, bpp : 3,
    transparent : 1,
    buffer : require("heatshrink").decompress(atob("kmSpIFFAQNIBAUEBAkSpMgBCggCBAQFEBAcCAQIIaFhBQaOhSGIARFIAoQaEhMAyVAkgwBkmCAoMABYOQBAOQGoIRBgmCDQUBCIRyCFgQpBAQQ4DOQIUBAoI"))
  };

  var GPSInterval = Bangle.isLCDOn()
    ? setInterval(()=>WIDGETS.widgpssat.draw(), 1000)
    : undefined;
  var isSatClear = true;

  var inSetWidth = false;
  function setWidth(w){
    if(WIDGETS.widgpssat.width != w) {
      WIDGETS.widgpssat.width = w;
      inSetWidth = true;
      Bangle.drawWidgets();
      inSetWidth = false;
    }
  }

  function draw() {
    if(inSetWidth) return;
    var x=this.x, y=this.y;
    var w = WIDGETS.widgpssat.width;
    g.clearRect(x, y, x+w, y+24);
    if(Bangle.isGPSOn()) {
      fix = Bangle.getGPSFix();
      //fix = testGPSFix();
      //print("fix",fix);
      if (fix && fix.fix) {
        g.reset();
        g.setFont("12x20",1);
        w = 28 + g.stringWidth(fix.satellites);
        setWidth(w);
        //g.drawRect(x, y, x+w-1, y+24-1);
        g.drawImage(SatGreen, x, y);
        g.drawString(fix.satellites, x+26, y+2);
      }
      else {
        //print("no fix", isSatClear);
        g.reset();
        setWidth(26);
        if(isSatClear)
          g.drawImage(SatClear, x, y);
        else 
          g.drawImage(SatRed, x, y);
        isSatClear = ! isSatClear;
      }
    }
    else {
      //print("isGPSOff");
      g.reset();
      setWidth(26);
      g.drawImage(SatClear, x, y);
    }
  }

  // add your widget
  WIDGETS.widgpssat = {
    area:"tr", // tl (top left), tr (top right), bl (bottom left), br (bottom right)
    width: 26, // how wide is the widget? You can change this and call Bangle.drawWidgets() to re-layout
    draw:draw // called to draw the widget
  };
})();

//Bangle.drawWidgets(); // <-- for development only
//Bangle.setGPSPower(1,"TST");
