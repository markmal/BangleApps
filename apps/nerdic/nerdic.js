// Nerdic binary watch
const RED="#FF0000",GREEN="#00FF00",BLUE="#0000FF",GRAY="#101010",WHITE="#FFFFFF";

g.reset();
g.setTheme({bg:"#000000"});
g.setBgColor(0,0,0);
g.clear();

var SW=g.getWidth(), SH=g.getHeight();
var FS=0.12*SH;
g.setFont("Vector",FS);
var HW=g.stringWidth("00:00:00");

var BangleVer = (SW==240)?1:(SW==176)?2:0;

var hoursColor = (BangleVer==1)?RED:WHITE,
  minutesColor = (BangleVer==1)?GREEN:WHITE,
  secondsColor = (BangleVer==1)?BLUE:WHITE;

var hintDuration=-1, hintMaxduration=5;
var LEDsz=SW/11, 
    L=(SW - (6*LEDsz+2.5*LEDsz))/2, //Left
    T=(SH - (3*LEDsz+LEDsz))/2; //Top

function drawLED(row, col, status){
  var x1=L+col*LEDsz*1.5, y1=T+row*LEDsz*1.5,
      x2=x1+LEDsz, y2=y1+LEDsz;
  if(status){
    g.fillEllipse(x1,y1,x2,y2);
  }else{
    g.drawEllipse(x1,y1,x2,y2);
  }
}

function drawLEDrow(row, V){
  var y1=T+row*LEDsz*1.5, y2=y1+LEDsz,
      x1=L, x2=x1+5*LEDsz*1.5+LEDsz;
  switch(row){
    case 0: g.setColor(hoursColor); break;
    case 1: g.setColor(minutesColor); break;
    case 2: g.setColor(secondsColor); break;
  }
  g.clearRect(x1,y1,x2,y2);
  for(let i=0,m=32; i<6; i++,m>>=1) drawLED(row,i,V&m);
}

var _H=-1,_M=-1,_S=-1;
E.setTimeZone(-5);

function draw(){
  var D=new Date();

  H = D.getHours();
  if( _H != H ){
     drawLEDrow(0,H);
    _H = H;
  }

  M = D.getMinutes();
  if( _M != M ){
     drawLEDrow(1,M);
    _M = M;
  }

  S = D.getSeconds();
  if( _S != S ){
     drawLEDrow(2,S);
    _S = S;
  }

  var x=(SW-HW)/2, y=T+4.5*LEDsz;
  if(hintDuration>0){
    g.clearRect(x,y,x+HW,y+FS);
    g.setColor(WHITE);
    g.setFont("Vector",FS);
    g.drawString(D.toString().substr(16,8),x,y);
    hintDuration--;
  }else{
    if(hintDuration==0){
      g.clearRect(x,y,x+HW,y+FS);
      hintDuration--;
    }
  }

}

// ---------- 
var settings = Object.assign({
  // default values
  hours_color:   (BangleVer==1)?GREEN:WHITE,
  minutes_color: (BangleVer==1)?GREEN:WHITE,
  seconds_color: (BangleVer==1)?GREEN:WHITE,
  hint_duration: 5
}, require('Storage').readJSON("nerdic.json", true) || {});
// require('Storage').writeJSON("nerdic.json", settings);

hoursColor = settings.hours_color!==undefined ? settings.hours_color : hoursColor;
minutesColor = settings.minutes_color!==undefined ? settings.minutes_color : minutesColor;
secondsColor = settings.seconds_color!==undefined ? settings.seconds_color : secondsColor;
hintMaxduration = settings.hint_duration!==undefined ? settings.hint_duration : 5;

// Clear the screen once, at startup
g.clear();
// draw immediately at first
draw();
var secondInterval = setInterval(draw, 1000);
// Stop updates when LCD is off, restart when on
Bangle.on('lcdPower',on=>{
  if (secondInterval) clearInterval(secondInterval);
  secondInterval = undefined;
  if (on) {
    secondInterval = setInterval(draw, 1000);
    draw(); // draw immediately
  }
});
// Show launcher when middle button pressed
Bangle.setUI("clock");
// Load widgets
Bangle.loadWidgets();
Bangle.drawWidgets();

Bangle.on('tap', function(data) {
  print(data); //data.dir=="right" &&
  if(data.double)
    hintDuration = hintMaxduration;
});
