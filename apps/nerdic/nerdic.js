// Nerdic binary watch
const RED="#FF0000",GREEN="#00FF00",BLUE="#0000FF",GRAY="#101010",WHITE="#FFFFFF";

g.reset();
g.setTheme({bg:"#000000"});
g.setBgColor(0,0,0);
g.clear();

var hintDuration=0;
var LEDsz=18;
function drawLED(row, col, status){
  var y1=46+row*LEDsz*1.8, x1=16+col*LEDsz*1.4, x2=x1+LEDsz, y2=y1+LEDsz;
  //g.clearRect(x1,y1,x2,y2);
  if(status){
    g.setColor(WHITE);
    g.fillEllipse(x1,y1,x2,y2);
  }else{
    g.setColor(0.5,0.5,0.5);
    g.drawEllipse(x1,y1,x2,y2);
  }
}

function drawLEDrow(row, V){
  var y1=46+row*LEDsz*1.8, y2=y1+LEDsz,
      x1=16, x2=x1+5*LEDsz*1.4+LEDsz;
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

  var x=42, y=132;
  if(hintDuration){
    g.setFont("Vector",24);
    g.clearRect(x,y,x+98,y+21);
    g.setColor(WHITE);
    g.drawString(D.toString().substr(16,8),x,y);
    hintDuration--;
  }else{
    g.clearRect(x,y,x+98,y+24);
  }

}

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
    hintDuration = 5;
});
