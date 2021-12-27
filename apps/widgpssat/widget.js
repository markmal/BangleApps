// This is for testing in emulator
isTestGPSpower=false;
isTestGPSfix=false;
/*
function testGPSfix() {
  return {
  "lat": 43.6364044+(Math.random()-0.5)*0.0001,      // Latitude in degrees
  "lon": -79.347+(Math.random()-0.5)*0.0001,      // Longitude in degrees
  "alt": Math.random()*1,      // altitude in M
  "speed": 30+(Math.random()-0.5)*10,    // Speed in kph
  "course": 90+(Math.random()-0.5)*20,   // Course in degrees
  "time": Date.now(),       // Current Time (or undefined if not known)
  "satellites": Math.round(Math.random()*10),    // Number of satellites
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
    buffer : require("heatshrink").decompress(atob("kmSpICZoIIHEw+QhEEBAuApMACI0JkECEYsBkkAAQIIDoEkgQCBBAdIgESpAIGAQJBFBANAIIlBkESgAIEFIMAhJKEpEEwBKBiQjEyBHBKYgOBDoJoBIIsEMowdBEYgdDXLdJA=="))
  };
  var SatGreen = {
    width : 24, height : 24, bpp : 3,
    transparent : 1,
    buffer : require("heatshrink").decompress(atob("kmSpICZoIIHEw+QjEEBAuA6UACI0SoECEYsCpkAgIIEoFEgmABAlIGwOQBAsB0gIFpMD0mAIIlBkEkgAIEoAHBhRKEpA0BJQMSEYcAyECpBTEkAQBBgJcFpEIMowQBEYgdDXLdJA"))
  };

  var SatRed = {
    width : 24, height : 24, bpp : 3,
    transparent : 1,
    buffer : require("heatshrink").decompress(atob("kmSpICZoIIHEw+QkEEBAuBkkACI0kwECEYsEyEAgIIEoGQhIvFpEApMgBAoiBBAtJBAMAIIlBkAcBBAlAJAJKFpEEwBKBiQjDgGQJQJTEkESoB5BLgtIiBlGDoIjEDoa5bpI"))
  };

  var GPSInterval = Bangle.isLCDOn()
    ? setInterval(()=>WIDGETS["GPSwidget"].draw(), 1000)
    : undefined;
  var isSatClear = true;
  var SatCount = 0;
  var isCleared = false;

  function draw() {
      // add your code
    if(Bangle.isGPSOn() || isTestGPSpower) {
      fix = ! isTestGPSfix ? Bangle.getGPSFix() : testGPSfix();
      if (fix) {
        if(SatCount != fix.satellites) {
          g.reset(); // reset the graphics context to defaults (color/font/etc)
          g.clearRect(this.x, this.y, this.x+48, this.y+23);
          g.drawImage(SatGreen, this.x, this.y);
          g.setFont("6x8",2);
          g.drawString(fix.satellites, this.x+22, this.y+2);
          SatCount = fix.satellites;
          isCleared = false;
        }
      }
      else {
        g.reset();
        g.clearRect(this.x, this.y, this.x+48, this.y+23);
        if(isSatClear)
          g.drawImage(SatClear, this.x, this.y);
        else 
          g.drawImage(SatRed, this.x, this.y);
        isSatClear = ! isSatClear;
        SatCount = 0;
        isCleared = false;
      }
    }
    else if(!isCleared){
      g.reset();
      g.clearRect(this.x, this.y, this.x+48, this.y+23);
      isCleared = true;
    }
  }

  // add your widget
  WIDGETS["GPSSatWidget"]={
    area:"tl", // tl (top left), tr (top right), bl (bottom left), br (bottom right)
    width: 48, // how wide is the widget? You can change this and call Bangle.drawWidgets() to re-layout
    draw:draw // called to draw the widget
  };
})();