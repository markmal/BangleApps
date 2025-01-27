Bangle.loadWidgets();
Bangle.drawWidgets();

var LastFix = {fix:-1,satellites:0};
var Speed=0.0, Speed2sec=0.0, Speed10sec=0.0, TotalDistance=0.0;

/*
var Layout = require("Layout");
var layout;

function onGPS(fix) {
  if (LastFix.fix != fix.fix) {
    // if fix is different, change the layout
    if (fix.fix) {
      layout = new Layout( {
        type:"v", c: [
          //{type:"txt", font:"6x8:2", label:"Speed" },
          {type:"h", c: [
            //{type:"img", src:speedoImage, pad:4 },
            {type:"txt", font:"60%", label:"---", fillx:false, id:"speedInt" },
            {type:"v", c: [
              {type:"txt", font:"25%", label:"-", fillx:false, id:"speedDec" },
              {type:"txt", font:"10%", label:"-", id:"units" },
            ]}
          ]},
         /*{type:"h", c: [
            {type:"txt", font:"10%", label:fix.satellites, pad:2, id:"sat" },
            {type:"txt", font:"6x8", pad:3, label:"Satellites" }
          ]},* /
        ]},{lazy:true});
    } else {
      layout = new Layout( {
        type:"v", c: [
         {type:"txt", font:"6x8:2", label:"Speed" },
          {type:"img", src:speedoImage, pad:4 },
          {type:"txt", font:"6x8", label:"Waiting for GPS" },
          {type:"h", c: [
            {type:"txt", font:"10%", label:fix.satellites, pad:2, id:"sat" },
            {type:"txt", font:"6x8", pad:3, label:"Satellites" }
          ]},
        ]},{lazy:true});
    }
    g.clearRect(0,24,g.getWidth(),g.getHeight());
    layout.render();
  }
  LastFix = fix;

  if (fix.fix && isFinite(fix.speed)) {
    var speed = require("locale").speed(fix.speed);
    var m = speed.match(/([0-9,\.]+)(.*)/); // regex splits numbers from units
    //var txt = (fix.speed<20) ? fix.speed.toFixed(2) : Math.round(fix.speed);
    //layout.speed.label = m[1];
    //layout.units.label = m[2];
    //txt = fix.speed.toFixed(1);
    spdI = Math.round(fix.speed);
    spdD = Math.round((fix.speed - spdI)*10);
    layout.speedInt.label = spdI;
    layout.speedDec.label = "." + spdD;
    layout.units.label = "k/h";
  }
  //layout.sat.label = fix.satellites;
  layout.render();
}
*/

// ---------- Efficient way of drawing ------------ //
function renderDigit(D, x,y, w,h) {
  g.clearRect(x,y, x+w, y+h+4);
  g.drawString(D, x,y, false);
  return x+w;
}

// previous digits
var dHp=" ", dDp=" ", dSp="0", dFp="0", Up=" ", dSpeed2sec=NaN, dSpeed10sec=NaN, Lp=0;

function resetDigits(){
  dHp=" "; dDp=" "; dSp="0"; dFp="0"; Up=" "; 
  dSpeed2sec=NaN; dSpeed10sec=NaN; Lp=0;
}

require("Font8x16").add(Graphics);

function renderSpeeds(speed, speed2s, speed10s, unit) {
  var S = speed.toFixed(1);
  var L = S.length;
  S = S.padStart(5," ");
  S = S.substr(S.length-5,5);
  var dH, dD, dS, dF;
  dH=S.substr(0,1);
  dD=S.substr(1,1);
  dS=S.substr(2,1);
  dF=S.substr(4,1);

  //print(S, dH,dD,dS,dF);
  g.setColor(0,0,0);
  g.drawLine(0,25,176,25);
  //g.setFont("6x15",1); 
  g.setFont("8x16");
  g.clearRect(60, 26, 150, 37);
  g.drawString(TotalDistance.toFixed(2)+" Km", 60, 26);
  
  var x0=60, dW=30, y0=38;
  if(speed>=10) x0 = 35;
  if(speed>=100) x0 = 9;
  
  g.setFont("Vector",80); 
  var w = g.stringWidth("0")-4, h=60; 

  if (L != Lp){
    g.clearRect(0,y0, 190, y0+h+4);
    Lp = L;
    dHp="X"; dDp="X"; dSp="X"; dFp="X"; Up="X";  
  }
  
  if(dH!=" ") if(dH!=dHp) x0=renderDigit(dH,x0,y0, w,h); else x0+=w;
  if(dD!=" ") if(dD!=dDp) x0=renderDigit(dD,x0,y0, w,h); else x0+=w;
  if(dS!=dSp) x0=renderDigit(dS,x0,y0, w,h); else x0+=w;
  if(dF!=dFp){
    g.setFont("Vector",36);
    renderDigit(dF, x0,y0+3, w,36);
  } else x0+=w;
  if(Up!=unit){
    g.setFont("Vector",16);
    renderDigit(unit, x0,y0+42, w,16);
  }
  dHp=dH; dDp=dD; dSp=dS; dFp=dF; Up=unit;
  if(speed2s != dSpeed2sec) {
    g.setFont("Vector",16);
    g.drawString("max 2s",15,105);
    g.setFont("Vector",29);
    g.clearRect(15,119, 90,148);
    g.drawString(speed2s.toFixed(1),15,119);
    dSpeed2sec=speed2s;
  }
  if(speed10s != dSpeed10sec) {
    g.setFont("Vector",16);
    g.drawString("max 10s",95,105);
    g.setFont("Vector",29);
    g.clearRect(95,119, 170,148);
    g.drawString(speed10s.toFixed(1),95,119);
    dSpeed10sec=speed10s;
  }

  g.drawLine(0,150,176,150);
}

var LastSpeeds = new Array(0);
function addSpeed(time, speed, lat, lon) {
  LastSpeeds.unshift({time:time, speed:speed, lat:lat, lon:lon});
  if(LastSpeeds.length>20)
    LastSpeeds.pop();
}

var MaxSpeed2sec=0.0, MaxSpeed10sec=0.0;

function calcSpeed2n10sec() {
  if (LastSpeeds.length>1) {
    var recA = LastSpeeds[0];
    var recB = LastSpeeds[1];
    var spdSum = recA.speed + recB.speed;
    var N=2; 
    while(((recA.time - recB.time) < 2000) 
          && N<LastSpeeds.length){
      //print("Sec2: ", recA.time - recB.time, N, recA.speed, recB.speed, LastSpeeds[N].speed);
      recB = LastSpeeds[N];
      spdSum += recB.speed;
      N++;
      //print(spdSum, N, spdSum / N);
    }
    if((recA.time - recB.time) >= 2000)
      if(MaxSpeed2sec < spdSum / N)
        MaxSpeed2sec = spdSum / N;
    //print("MaxSpeed2sec:",MaxSpeed2sec);

    while(((recA.time - recB.time) < 10000) 
          && N<LastSpeeds.length){
      //print("SecA: ", recA.time - recB.time);
      recB = LastSpeeds[N];
      spdSum += recB.speed;
      N++;
    }
    if((recA.time - recB.time) >= 10000)
      if(MaxSpeed10sec < spdSum / N)
        MaxSpeed10sec = spdSum / N;
    //print("MaxSpeed10sec:",MaxSpeed10sec);
  
  }
}

var IsSpeedDisplayDirty=true;

function onGPS_raw(nmea) {
  print(nmea);
  if(nmea.substring(3,6) == "GGA") {
    fix = Bangle.getGPSFix();
    print("fix.speed: ",fix.speed);
  }
  Speed = LastFix.speed;
  if (fix.fix && isFinite(fix.speed)) {
     Speed = fix.speed;
  } else {
     Speed = 0.0;
  }
  
  IsSpeedDisplayDirty = (LastFix.speed != Speed);
  
  addSpeed(fix.time, fix.speed, fix.lat, fix.lon);
  calcSpeed2n10sec();
  
  if(LastFix && LastFix.time)
    TotalDistance = TotalDistance + Speed * (fix.time - LastFix.time)*0.001/3600;
  LastFix = fix;
  LastFix.speed = Speed;
}


var SimSpeed = 20, SimAcceleration = 1.0;
function simulateGPS() {
  if( (Date.now() % 60000) < 30000)
    SimAcceleration = 1.1;
  else
    SimAcceleration = 0.9;
  SimSpeed = SimSpeed * SimAcceleration;
  onGPS({fix:1,satellites:3,speed:SimSpeed, 
       time:Date.now()});
}

function onInterval() {
  //simulateGPS();
  if(IsSpeedDisplayDirty)
    renderSpeeds(Speed, MaxSpeed2sec, MaxSpeed10sec, "kph");
  IsSpeedDisplayDirty = false;
}

var IsRecording = false;
var BtnRecording = "Start Rec";
function toggleRecording(){
  IsRecording = ! IsRecording;
  BtnRecording = IsRecording ? "Stop Rec" : "Start Rec";
  print(BtnRecording);
  hideMenu();
}

// GUI
var Layout = require("Layout");

var loDisplay = {
  type:"v", c: [
    {type:"txt", font:"6x8:4", label:"A Test", id:"label"},
  ]
};
var opDisplay = {btns:[
  {label:"Menu", cb: l=>showMenu()}
], lazy:true};

var loMenu = {
  type:"v", c: [
    //{type:"txt", font:"6x8:2", label:"A Test", id:"label"},
    {type:"btn", font:"6x8:2", color:"Red", label:BtnRecording, cb: l=>toggleRecording() },
    {type:"btn", font:"6x8:2", label:"Exit", cb: l=>hideMenu() }
  ]
};
var opMenu = {btns:[{label:"Close",cb: l=>hideMenu()}],
    lazy:false
   };

var layout; // = new Layout(loMenu, opMenu);
var WatchButton;
var DisplayInterval;

function onWatchButton() {
    console.log("Pressed");
    if(!layout)
      showMenu();
  }

function showMenu() {
  print("showMenu");
  print("clr DisplayInterval:",DisplayInterval);
  clearInterval(DisplayInterval);
  clearWatch(WatchButton);
  //layout.clear();
  g.clear();
  layout = new Layout(loMenu, opMenu);
  layout.render();
}

function hideMenu() {
  print("hideMenu");
  if(!layout) return;
  if(layout)
    layout.clear(); 
  layout = null;
  //layout = new Layout(loDisplay, opDisplay);
  //layout.render();
  resetDigits();
  WatchButton = setWatch(onWatchButton, BTN, {edge:"falling", debounce:100, repeat:false});
  DisplayInterval = setInterval(onInterval,1000);
  print("new DisplayInterval:",DisplayInterval);
}


//======== BEGIN =======
g.clear();
Bangle.on('GPS-raw', onGPS_raw);
Bangle.setGPSPower(1, "WS Speed");
DisplayInterval = setInterval(onInterval,1000);

WatchButton = setWatch(onWatchButton, BTN, {edge:"falling", debounce:100, repeat:false});

//// -------- Testing ---------
/*
onGPS({fix:1,satellites:3,speed:37.5, 
       time:Date.parse("2021-10-20T14:48:00")}); // testing
onGPS({fix:1,satellites:3,speed:37.4,
       time:Date.parse("2021-10-20T14:48:01")}); // testing
onGPS({fix:1,satellites:3,speed:37.8,
       time:Date.parse("2021-10-20T14:48:02")}); // testing
onGPS({fix:1,satellites:3,speed:37.6,
       time:Date.parse("2021-10-20T14:48:03")}); // testing
onGPS({fix:1,satellites:3,speed:36.2,
       time:Date.parse("2021-10-20T14:48:04")}); // testing
onGPS({fix:1,satellites:3,speed:37.4,
       time:Date.parse("2021-10-20T14:48:05")}); // testing
onGPS({fix:1,satellites:3,speed:38.2,
       time:Date.parse("2021-10-20T14:48:06")}); // testing
onGPS({fix:1,satellites:3,speed:38.3,
       time:Date.parse("2021-10-20T14:48:07")}); // testing
onGPS({fix:1,satellites:3,speed:38.4,
       time:Date.parse("2021-10-20T14:48:08")}); // testing
onGPS({fix:1,satellites:3,speed:36.2,
       time:Date.parse("2021-10-20T14:48:09")}); // testing
onGPS({fix:1,satellites:3,speed:35.1,
       time:Date.parse("2021-10-20T14:48:10")}); // testing
onGPS({fix:1,satellites:3,speed:35.4,
       time:Date.parse("2021-10-20T14:48:11")}); // testing

onInterval();
*/

