// WIDGETS = {}; // <-- for development only

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
    ? setInterval(()=>WIDGETS["widgpssat"].draw(), 1000)
    : undefined;
  var isSatClear = true;
  var SatCount = 0;
  var isCleared = false;

  function drawSat(sat,x,y){
    g.clearRect(x, y, x+48, y+23);
    g.drawImage(sat, x, y);
  }

  function draw() {
    // add your code
    var x=this.x, y=this.y;
    if(Bangle.isGPSOn()) {
      fix = Bangle.getGPSFix();
      //print("fix",fix);
      if (fix && fix.fix) {
        if(SatCount != fix.satellites) {
          g.reset(); // reset the graphics context to defaults (color/font/etc)
          drawSat(SatGreen, x, y);
          g.setFont("6x8",2);
          g.drawString(fix.satellites, x+22, y+2);
          SatCount = fix.satellites;
          isCleared = false;
        }
      }
      else {
        //print("no fix", isSatClear);
        g.reset();
        if(isSatClear)
          drawSat(SatClear, x, y);
        else 
          drawSat(SatRed, x, y);
        isSatClear = ! isSatClear;
        SatCount = 0;
        isCleared = false;
      }
    }
    else if(!isCleared){
      //print("isGPSOff");
      g.reset();
      drawSat(SatClear, x, y);
      isCleared = true;
    }
  }

  // add your widget
  WIDGETS["widgpssat"]={
    area:"tr", // tl (top left), tr (top right), bl (bottom left), br (bottom right)
    width: 48, // how wide is the widget? You can change this and call Bangle.drawWidgets() to re-layout
    draw:draw // called to draw the widget
  };
})();

//Bangle.drawWidgets(); // <-- for development only
//Bangle.setGPSPower(1,"TST");
