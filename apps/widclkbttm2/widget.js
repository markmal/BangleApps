//WIDGETS = {}; // <-- for development only

(function() {
  // don't show widget if we know we have a clock app running
  if (Bangle.CLOCK) return;

  let intervalRef = null;
  var width = 8*12;
  //var text_color=0x07FF;//cyan 
  var inDrawWidgets = false;
  
  function draw() {
    if(inDrawWidgets) return;
    g.reset();
    //g.setFont("6x15",1);
    //g.setFont("12x20",1);
    g.setFont("Vector",21);
    g.setFontAlign(-1, 0);//.setColor(text_color);
    //var time = require("locale").time(new Date(),1);
    var d = (new Date()).toString();
    var time = d.substr(d.length-17,8);
    var w = g.stringWidth("00:00:00");
    if(WIDGETS.wdclkbttm2.width != w) {
      WIDGETS.wdclkbttm2.width = w;
      inDrawWidgets = true;
      Bangle.drawWidgets();
      inDrawWidgets = false;
    }
    g.clearRect(this.x, this.y, this.x+w, this.y+24);
    g.drawString(time, this.x, this.y+14, false); // 5 * 6*2 = 60
  }
  function clearTimers(){
    if(intervalRef) {
      clearInterval(intervalRef);
      intervalRef = null;
    }
  }
  function startTimers(){
    var t=Math.floor(getTime());
    while(Math.floor(getTime())==t) t=Math.floor(getTime());
    intervalRef = setInterval(()=>WIDGETS.wdclkbttm2.draw(), 1000);
    WIDGETS.wdclkbttm2.draw();
  }
  Bangle.on('lcdPower', (on) => {
    clearTimers();
    if (on) startTimers();
  });

  WIDGETS.wdclkbttm2={area:"br",width:width,draw:draw};
  if (Bangle.isLCDOn) 
    //intervalRef = setInterval(()=>WIDGETS.wdclkbttm2.draw(), 1000);
    startTimers();
})();

//Bangle.drawWidgets(); // <-- for development only
