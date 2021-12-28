//WIDGETS = {}; // <-- for development only

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
    ? setInterval(()=>WIDGETS.widgpssat.draw(), 1000)
    : undefined;
  var isSatClear = true;

  function drawSat(sat,x,y){
    g.clearRect(x, y, x+WIDGETS.widgpssat.width, y+23);
    g.drawImage(sat, x, y);
  }

  function setWidth(w){
    if(WIDGETS.widgpssat.width != w) {
      WIDGETS.widgpssat.width = w;
      Bangle.drawWidgets();
    }
  }
  
  function draw() {
    // add your code
    var x=this.x, y=this.y;
    if(Bangle.isGPSOn()) {
      fix = Bangle.getGPSFix();
      //print("fix",fix);
      if (fix && fix.fix) {
        g.reset(); // reset the graphics context to defaults (color/font/etc)
        setWidth(26 + g.stringWidth(fix.satellites));
        drawSat(SatGreen, x, y);
        g.setFont("6x8",2);
        g.drawString(fix.satellites, x+22, y+2);
      }
      else {
        //print("no fix", isSatClear);
        g.reset();
        setWidth(24);
        if(isSatClear)
          drawSat(SatClear, x, y);
        else 
          drawSat(SatRed, x, y);
        isSatClear = ! isSatClear;
      }
    }
    else {
      //print("isGPSOff");
      g.reset();
      setWidth(26);
      drawSat(SatClear, x, y);
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