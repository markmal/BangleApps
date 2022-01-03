/* Copyright (c) 2021 Mark Malakanov. See the file LICENSE for copying permission. */
/*
AT6558
Provides functions, controls, settings for AT6558 based GNSS module.
It incapsulates Bangle.GPS
See usage examples at the bottom 
*/

AT6558 = function(id){
  this.id = id;
  this._ = AT6558.prototype; // Global vars of prototype level
  this._.sys = "";
  this._.IC = "";
  this._.SW = "";
  this._.buildTime = "";
  this._.mode = "";
  this._.status = "";
  this._.lat = NaN;
  this._.lon = NaN;
  this._.SOG_kn = NaN;
  this._.SOG_km = NaN;
  this._.COG = NaN;
  this._.date = "1970-01-01";
  this._.time = "00:00:00";
  this._.FS = 0;
  this._.numSats = 0;
  this._.msl = 0;
  this._.serialBaudRate = 9600;
  this._.baudRate = 9600;
  this._.updateRates = {};
  this._.ActiveSats=[];
  this._.ViewSats=[];
  this._.isStartUp = false;
  this.needsValidation = false;
  this.distance_loc = 0.0;
  this.distance_spd = 0.0;
  this.TZ = "00:00";
  this.distSpdSOG = NaN;
  this.distLocTime = new Date();
  this.sensitivitySpd = 0.1; // kph
  this.sensitivityLoc = 0.00001; // dgr
  this.sensitivityCrs = 1.0; // dgr 
}

// misc functions

AT6558.prototype.checksum = function(val) {
  var cs = 0;
  for (const c of val) {
    cs = cs ^ c.charCodeAt(0); //XOR
  }
  return cs.toString(16).toUpperCase().padStart(2, '0');
};

AT6558.prototype.sendCommand = function(command) {
  cmd = "P" + command;
  cs = this.checksum(cmd);
  cmd = "$" + cmd + "*" + cs;
  //print(cmd);
  Serial1.println(cmd);
};

AT6558.prototype.distance = function(lat1, lon1, lat2, lon2) {
  var p = 0.017453292519943295;    // Math.PI / 180
  var c = Math.cos;
  var a = 0.5 - c((lat2 - lat1) * p)/2 + 
          c(lat1 * p) * c(lat2 * p) * 
          (1 - c((lon2 - lon1) * p))/2;
  return 12742000 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

AT6558.prototype.isStarted = function() {
  return mode != "";
};

// check if a line is NMEA sentence
AT6558.prototype.isNMEA = function(line) {
  //print(line.substring(line.length-3,1));
  return (line.substring(0,1)=="$" 
          && line.substring(line.length-3,line.length-2)=="*");
};

// Increment distance from previous and current locations.
AT6558.prototype.addDistLoc = function(prev) {
  if(!this.chngLocTime) this.chngLocTime=this.datetime;
  if(this.chngLocTime != this.datetime 
     && !isNaN(prev.lat) && !isNaN(this._.lat)
     && !isNaN(prev.lon) && !isNaN(this._.lon)
     && (prev.lat != this._.lat || prev.lon != this._.lon)){
    this.distance_loc += this.distance(prev.lat, prev.lon, this._.lat, this._.lon);
    this.chngLocTime = this.datetime;
  }
};

// Increment distance from average speed in the period.
AT6558.prototype.addDistSpd = function(){
  if(!isNaN(this.SOG_km) && this.datetime
       && this.datetime != this.distSpdTime) {
    if(!this.distSpdTime) this.distSpdTime = this.datetime;
    if(isNaN(this.distSpdSOG)) this.distSpdSOG = this._.SOG_km;
    this.distance_spd += 0.5*(this.distSpdSOG+this._.SOG_km)/3.6 * (this.datetime-this.distSpdTime)*0.001; // m
    this.distSpdSOG = this._.SOG_km;
    this.distSpdTime = this.datetime;
  }
};

// Convert NMEA angle to numeric signed angle
AT6558.prototype.nmeaAtoAngle = function(a, u){
  var d = a.indexOf(".");
  return (parseInt(a.substr(0,d-2),10)+parseFloat(a.substr(d-2))/60)*(u=="S"?-1:1);
};
// Convert NMEA date string DDMMYY to ANSI date string YYYY-MM-DD
AT6558.prototype.nmeaDtoDate = function(d){
  return ("20"+d.substr(4,2)+"-"+d.substr(2,2)+"-"+d.substr(0,2));
};
// Convert NMEA time string hhmmss.fff to ANSI date string hh:mm:ss.fff
AT6558.prototype.nmeaTtoTime = function(t){
  return (t.substr(0,2)+":"+t.substr(2,2)+":"+t.substr(4,2)+t.substr(6,4));
};
// Convert NMEA date and time strings Date object
AT6558.prototype.nmeaDTtoDateTime = function(d,t){
  return new Date(this.nmeaDtoDate(d)+"T"+this.nmeaTtoTime(t)+"+00:00");
};


// ---- Handlers and Callbacks

// Info about the device. Usually shown when GNSS starts
AT6558.prototype.onInfo = function(callback){
  this.cbInfo = callback;
};

AT6558.prototype.getChipInfo = function() {
  return { manufacturer:this._.manufacturer, 
      ID:this._.IC, SW:this._.SW, buildTime:this._.buildTime, 
      mode:this._.mode};
}

AT6558.prototype.hndlInfo = function(msg) {
  //print("hndlInfo:",msg);
  var fld = msg.substr(0,3);
  var val = msg.substr(3,255);
  if(fld == "MA=") this._.manufacturer = val; 
  if(fld == "IC=") this._.IC = val;
  if(fld == "SW=") this._.SW = val;
  if(fld == "TB=") this._.buildTime = val; 
  if(fld == "MO=") this._.mode = val;
  if(this.cbInfo) this.cbInfo(msg);
};

// ANT - Antenna Status. For Bangle2 is always Open because it has a passive antenna.
AT6558.prototype.onANT = function(callback){
  this.cbANT = callback;
};

// process any TXT and call either ANT or Info handler
AT6558.prototype.hndlTXT = function(sntc) {
  var xx = sntc.substr(6,2); // total rows
  var yy = sntc.substr(9,2); // row number
  var zz = sntc.substr(12,2); // 00-error, 01-warning, 02-info, 07-custom
  var msg = sntc.substr(15,64);
  if(xx=="01" && yy=="01" && zz=="02")
    this.hndlInfo(msg);
  else if(xx=="01" && yy=="01" && zz=="01"){
    //print(sntc);
    if(msg.includes("ANTENNA")) {
      this._.antenna = msg;
      if(this.cbANT) this.cbANT({
        antenna: this._.antenna
        });
    }
  }
};

//DHV - Design Hourly Volume. Details of GNSS receiver speeds.
AT6558.prototype.onDHV = function(callback){
  this.cbDHV = callback;
};

AT6558.prototype.hndlDHV = function(sntc) {
  //print("DHV "+sntc);
  var prev = {SOG_km:this._.SOG_km, datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]) this._.time = this.nmeaTtoTime(d[1]);
  this._.speed3D = parseFloat(d[2]);
  this._.spdX = parseFloat(d[3]);
  this._.spdY = parseFloat(d[4]);
  this._.spdZ = parseFloat(d[5]);
  this._.spdG = parseFloat(d[6]); // m/s
  this._.SOG_km = this._.spdG * 3.6;
  if(this._.time && this._.date) 
    this.datetime = new Date(this._.date+"T"+this._.time+"+"+this.TZ);

  this.addDistSpd();

  if(this.cbDHV) this.cbDHV({
    sys: this._.sys,
    time: this._.time,
    speed3D: this._.speed3D,
    spdX: this._.spdX,
    spdY: this._.spdY,
    spdZ: this._.spdZ,
    spdG: this._.spdG
    });
};


// GGA - Fix Data
AT6558.prototype.onGGA = function(callback){
  this.cbGGA = callback;
};

AT6558.prototype.hndlGGA = function(sntc) {
  //print("GGA "+sntc);
  var prev = {lat:this._.lat, lon:this._.lon, datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]) this._.time = this.nmeaTtoTime(d[1]);
  this._.lat = this.nmeaAtoAngle(d[2],d[3]);
  this._.lon = this.nmeaAtoAngle(d[4],d[5]);
  this._.FS = parseInt(d[6]);
  this._.numSats = parseInt(d[7]);
  this._.HDOP = parseFloat(d[8]);
  this._.MSL = parseFloat(d[9]);
  //this.uMSL = d[10];
  this._.sep = parseFloat(d[11]);
  //this.uSep = d[12];
  this._.diffAge = parseFloat(d[13]);
  this._.diffSta = parseFloat(d[14]);
  if(this._.time && this._.date) 
    this.datetime = new Date(this._.date+"T"+this._.time+"+"+this.TZ);

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this._.lat) 
     && (prev.lat != this._.lat || prev.lon != this._.lon)){
    this.cbChngLoc({lat:this._.lat, lon:this._.lon});
  }

  if(this.cbGGA) this.cbGGA({
    sys: this._.sys,
    time: this._.time,
    lat: this._.lat,
    lon: this._.lon,
    FS: this._.FS,
    numSV: this._.numSats,
    HDOP: this._.HDOP,
    MSL: this._.MSL,
    sep: this._.sep,
    diffAge: this._.diffAge,
    diffSta: this._.diffSta
    });
};

// GLL - Geographic Position-Latitude/Longitude
AT6558.prototype.onGLL = function(callback){
  this.cbGLL = callback;
};

AT6558.prototype.hndlGLL = function(sntc) {
  //print("GLL: "+sntc);
  var prev = {lat:this._.lat, lon:this._.lon, datetime:this.datetime};
  var d = sntc.split(",");
  this._.lat = this.nmeaAtoAngle(d[1],d[2]);
  this._.lon = this.nmeaAtoAngle(d[3],d[4]);
  if(d[5]) this._.time = this.nmeaTtoTime(d[5]);
  this._.status = d[6];
  this._.mode = d[7];
  if(this._.time && this._.date) 
    this.datetime = new Date(this._.date+"T"+this._.time+"+"+this.TZ);

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this._.lat) 
     && (Math.abs(prev.lat - this._.lat) >= this.sensitivityLoc 
      || Math.abs(prev.lon - this._.lon) >= this.sensitivityLoc)){
    this.cbChngLoc({lat:this._.lat, lon:this._.lon});
  }

  if(this.cbGLL) this.cbGLL({
    sys: this._.sys,
    lat: this._.lat,
    lon: this._.lon,
    time: this._.time,
    status: this._.status,
    mode: this._.mode
    });
};

// GSA - GNSS DOP and Active Satellites 
AT6558.prototype.onGSA = function(callback){
  this.cbGSA = callback;
};

AT6558.prototype.hndlGSA = function(sntc) {
  //print("GSA: "+sntc);
  var d = sntc.split(",");
  this._.Smode = d[1];
  this._.FS = d[2];
  this._.systemId=d[18];
  var sid=parseInt(this._.systemId)-1;
  this._.ActiveSats[sid]=[d[3],d[4],d[5],d[6],d[7],d[8],d[9],d[10],d[11],d[12],d[13],d[14]];
  this._.PDOP=d[15];
  this._.HDOP=d[16];
  this._.VDOP=d[17];

  this._.numSats = 0;
  var i = 0;
  while(i < this.ActiveSats.length){
    if(this.ActiveSats[i] != "") this._.numSats++;
    i++;
  }

  if(this.cbGSA) this.cbGSA({
    sys: this._.sys,
    Smode: this._.Smode,
    FS: this._.FS,
    ActiveSats: this.ActiveSats,
    PDOP: this._.PDOP,
    HDOP: this._.HDOP,
    VDOP: this._.VDOP,
    systemId: this._.systemId
    });
};

// GST - GNSS Pseudorange Error Statistics
AT6558.prototype.onGST = function(callback){
  this.cbGST = callback;
};

AT6558.prototype.hndlGST = function(sntc) {
  //print("GST "+sntc);
  var d = sntc.split(",");
  if(d[1]) this._.time = this.nmeaTtoTime(d[1]);
  this._.RMS = parseFloat(d[2]);
  this._.stdDevMaj = parseFloat(d[3]);
  this._.stdDevMin = parseFloat(d[4]);
  this._.orientation = parseFloat(d[5]);
  this._.stdLat = parseFloat(d[6]);
  this._.stdLon = parseFloat(d[7]);
  this._.stdAlt = parseFloat(d[8]);
  if(this._.time && this._.date) 
    this.datetime = new Date(this._.date+"T"+this._.time+"+"+this.TZ);

  if(!isNaN(this.RMS) && this.cbGST) this.cbGST({
    sys: this._.sys,
    RMS: this._.RMS,
    stdDevMaj: this._.stdDevMaj,
    stdDevMin: this._.stdDevMin,
    orientation: this._.orientation,
    stdLat: this._.stdLat,
    stdLon: this._.stdLon,
    stdAlt: this._.stdAlt
    });
};

// GSV - GNSS Satellites in View
AT6558.prototype.onGSV = function(callback){
  this.cbGSV = callback;
};

AT6558.prototype.hndlGSV = function(sntc) {
  //print("GSV: "+sntc);
  var d = sntc.split(",");
  var numMsg = parseInt(d[1]);
  var msgNo = parseInt(d[2]);
  var numSV = parseInt(d[3]);
  if(msgNo==1) this.GSV_Sn=0;
  if(!this._.ViewSats[this._.sys]) this._.ViewSats[this._.sys]=[];
  var i=4; var n=d.length-1;
  while(i < n){
    var vs={SVId:d[i++], Ele:d[i++], Az:d[i++], cn0:d[i++]};
    this._.ViewSats[this._.sys][this._.GSV_Sn] = vs;
    this._.GSV_Sn++;
  }
  this._.signalId = d[i];

  if(msgNo==numMsg && this.cbGSV) this.cbGSV({
    sys: this._.sys,
    ViewSats: this._.ViewSats,
    signalId: this._.signalId
    });
};

// RMC - Recommended Minimum Navigation Information
AT6558.prototype.onRMC = function(callback){
  this.cbRMC = callback;
};

AT6558.prototype.hndlRMC = function(sntc) {
  //print("RMC "+sntc);
  var prev = {lat:this._.lat, lon:this._.lon, 
              SOG_km:this._.SOG_km, COG:this._.COG, 
              datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]&&d[9]) this.datetime = this.nmeaDTtoDateTime(d[9],d[1]);
  if(d[1]) this._.time = this.nmeaTtoTime(d[1]);
  this._.status = d[2];
  this._.lat = this.nmeaAtoAngle(d[3],d[4]);
  this._.lon = this.nmeaAtoAngle(d[5],d[6]);
  this._.SOG_kn = parseFloat(d[7]);
  this._.SOG_km = 1.852 * this.SOG_kn;
  this._.COG = parseFloat(d[8]);
  if(d[9]) this._.date = this.nmeaDtoDate(d[9]);
  this._.MV = this.nmeaAtoAngle(d[10],d[11]);
  this._.mode = d[12];
  this._.navStatus = d[13];

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this._.lat) 
     && (Math.abs(prev.lat - this._.lat) >= this.sensitivityLoc 
      || Math.abs(prev.lon - this._.lon) >= this.sensitivityLoc)){
    this.cbChngLoc({lat:this._.lat, lon:this._.lon});
  }

  this.addDistSpd();
  if(this.cbChngSpd && !isNaN(this._.SOG_km) 
    && Math.abs(prev.SOG_km - this._.SOG_km) >= this.sensitivitySpd ){
    this.cbChngSpd(this._.SOG_km);
  }

  if(this.cbChngCrs && !isNaN(this._.COG) 
    && Math.abs(prev.COG - this._.COG) >= this.sensitivityCrs )
    this.cbChngCrs(this._.COG);

  if(this.cbRMC) this.cbRMC({
    sys: this._.sys,
    datetime: this.datetime,
    time: this._.time,
    status: this._.status,
    lat: this._.lat,
    lon: this._.lon,
    SOG_kn: this._.SOG_kn,
    COG: this._.COG,
    date: this._.date,
    MV: this._.MV,
    mode: this._.mode,
    navStatus: this._.navStatus
    });
};

// VTG Course Over Ground and Ground Speed 
AT6558.prototype.onVTG = function(callback){
  this.cbVTG = callback;
};

AT6558.prototype.hndlVTG = function(sntc) {
  //print("VTG "+sntc);
  var prev = {SOG_km:this.SOG_km, COG:this.COG};
  var d = sntc.split(",");
  this._.COG = parseFloat(d[1]);
  this._.COGM = parseFloat(d[3]);
  this._.SOG_kn = parseFloat(d[5]);
  this._.SOG_km = parseFloat(d[7]);
  this._.mode = d[9];

  this.addDistSpd();
  if(this.cbChngSpd && !isNaN(this._.SOG_km) 
    && Math.abs(prev.SOG_km - this._.SOG_km) >= this.sensitivitySpd ){
    this.cbChngSpd(this.SOG_km);
  }
  if(this.cbChngCrs && !isNaN(this._.COG) 
    && Math.abs(prev.COG - this._.COG) >= this.sensitivityCrs )
    this.cbChngCrs(this._.COG);

  if(!isNaN(this.SOG_kn) && this.cbVTG) this.cbVTG({
    sys: this._.sys,
    COG: this._.COGT,
    COGM: this._.COGM,
    SOG_kn: this._.SOG_kn,
    SOG_km: this._.SOG_km,
    mode: this._.mode,
    });
};

// ZDA - Time & Date
AT6558.prototype.onZDA = function(callback){
  this.cbZDA = callback;
};

AT6558.prototype.hndlZDA = function(sntc) {
  //print("ZDA "+sntc);
  var d = sntc.split(",");
  if(d[1]) this._.time = this.nmeaTtoTime(d[1]);
  this._.date = d[4]+"-"+d[3]+"-"+d[2];
  this.TZ = d[5]+":"+d[6];
  if(this._.time && this._.date) 
    this.datetime = new Date(this._.date+"T"+this._.time+"+"+this.TZ);

  if(this.cbZDA) this.cbZDA({
    sys: this._.sys,
    datetime: this.datetime,
    time: this._.time,
    date: this._.date,
    TZ: this.TZ
    });
};


// On Start Up. First message after Power On
AT6558.prototype.onStartup = function(callback){
  this.cbStartUp = callback;
};

// any NMEA
AT6558.prototype.onNMEA = function(callback){
  this.cbNMEA = callback;
};

AT6558.prototype.hndlNMEA = function(line) {
  var sntc = line.substring(1,line.length-3);
  var cksm = line.substr(line.length-2,2);
  if(this.needsValidation && this.checksum(sntc)!=cksm) { 
    //print("Wrong checksum:",cksm);
    //this.checksum(sntc), sntc);
    return false;
  }
  if(this.cbNMEA){
    if(this._.isStartUp && this.cbStartUp){ 
      print("STARTUP");
      this.cbStartUp(); this._.isStartUp=false;
      }
    this.cbNMEA(line);
  }
  this._.sys = sntc.substr(0,2);
  this.cmd = sntc.substr(2,3);
  switch (this.cmd) {
    case "GGA": this.hndlGGA(sntc); break;
    case "DHV": this.hndlDHV(sntc); break;
    case "GLL": this.hndlGLL(sntc); break;
    case "GSA": this.hndlGSA(sntc); break;
    case "GST": this.hndlGST(sntc); break;
    case "GSV": this.hndlGSV(sntc); break;
    case "RMC": this.hndlRMC(sntc); break;
    case "TXT": this.hndlTXT(sntc); break;
    case "VTG": this.hndlVTG(sntc); break;
    case "ZDA": this.hndlZDA(sntc); break;
  } //sw
};

// On Change callbacks
AT6558.prototype.onChangeLocation = function(callback){
  this.cbChngLoc = callback;
};
AT6558.prototype.onChangeSpeed = function(callback){
  this.cbChngSpd = callback;
};
AT6558.prototype.onChangeCourse = function(callback){
  this.cbChngCrs = callback;
};

AT6558.prototype.hndlRaw = function(line) {
  if(this.isNMEA(line)) this.hndlNMEA(line);
};

AT6558.prototype.powerOn = function() {
  this.isStartUp = true;
  var r = Bangle.setGPSPower(1, this.id);
  Bangle.on("GPS-raw", (line)=>{this.hndlRaw(line);});
};

AT6558.prototype.powerOff = function() {
  //Serial1.removeListener('data',gpsdata);
  Bangle.on("GPS-raw", function(){});
  Bangle.setGPSPower(0, this.id);
};

// Compatibility with Bangle
AT6558.prototype.getGPSFix = function() {
  var d = this._;
  var fix = ((d.FS)?d.FS:(d.FS=="A")?1:0); 
  return {time:d.datetime, lat:d.lat, lon:d.lon, 
    fix:fix, satellites:d.numSats, altitude:d.msl,
    speed:d.SOG_km,
    status:d.status, mode:d.mode};
}


//// ----------- Configuration and Control functions

// CAS00-Save Configuration 
// Save the current configuration information to FLASH, even if the receiver is completely powered off, the information in FLASH will not be lost.
AT6558.prototype.saveConfiguration = function() {
  this.sendCommand("CAS00");
};

// Set the baud rate of serial communication
function setSerial1BaudRate(){
  //print("set Serial1 BaudRate", baudRate);
  Serial1.setup(baudRate,{rx:D30, tx:D31});
  this._.serialBaudRate = baudRate;
}

function setBaudRate(br){
  if(this._.serialBaudRate == this._.baudRate){
    var brn = "";
    switch (br) {
      case 4800:  brn = "0"; break;
      case 9600:  brn = "1"; break;
      case 19200: brn = "2"; break;
      case 38400: brn = "3"; break;
      case 57600: brn = "4"; break;
      case 115200:brn = "5"; break;
      default:
        return;
    }
    //print("set Baud Rate", br);
    this._.baudRate = br;
    sendCommand("CAS01," + brn);
  }
  const to1 = setTimeout(setSerial1BaudRate,1000);
}

// Set the positioning update rate in milliSec
AT6558.prototype.setUpdateRate = function(v) {
  if(!(v==100||v==200||v==250||v==500||v==1000)) return;
  this._.updateRate = v;
  this.sendCommand("CAS02," + v.toString(0));
};

/*Set the NMEA sentence that requires output or stop output.
 Number character passed into each parameter is output frequency, 
 sentence output frequency is based on the positioning update rate
 Accurate, n ("0" - "9") means output once every n times, 
 "0" means - Do not output the sentence,
 and empty string means keep the original configuration if it is empty.
*/   
AT6558.prototype.setSentencesS = function(nGGA,nGLL,nGSA,nGSV,nRMC,nVTG,nZDA,nANT,nDHV,nTXT,nGST) {
  this.sendCommand("CAS03,"+nGGA+","+nGLL+","+nGSA+","+nGSV+","+nRMC+","
    +nVTG+","+nZDA+","+nANT+","+nDHV+",,"+nTXT+",,,"+nGST );
  this._.sentences = {GGA:nGGA,GLL:nGLL,GSA:nGSA,GSV:nGSV,RMC:nRMC,VTG:nVTG,ZDA:nZDA,ANT:nANT,DHV:nDHV,TXT:nTXT,GST:nGST};
};
AT6558.prototype.setSentences = function(sents) {
  this.sendCommand("CAS03,"+(sents.GGA||'')+","+(sents.GLL||'')+","+
    (sents.GSA||'')+","+(sents.GSV||'')+","+(sents.RMC||'')+","+
    (sents.VTG||'')+","+(sents.ZDA||'')+","+(sents.ANT||'')+","+
    (sents.DHV||'')+",,"+(sents.TXT||'')+",,,"+(sents.GST||'') );
  this._.sentences = sents;
};
AT6558.prototype.setSentencesAll = function(n) {
  this.sendCommand("CAS03,"+n+","+n+","+n+","+n+","+n+","
    +n+","+n+","+n+","+n+",,"+n+",,,"+n );
  this._.sentences = {GGA:n,GLL:n,GSA:n,GSV:n,RMC:n,VTG:n,ZDA:n,ANT:n,DHV:n,TXT:n,GST:n};
};

// Configure the working system (constellations)). Set 0 or 1 for each system
AT6558.prototype.setSystems = function(nGPS, nBDS, nGLONASS) {
  var n = nGPS | 2*nBDS | 4*nGLONASS;
  this.sendCommand("CAS04,"+n.toFixed(0));
  this._.systems={GPS:nGPS, BDS:nBDS, GLONASS:nGLONASS};
};

/* Set NMEA protocol type selection. There are many types of protocols
   for multi-mode navigation receivers, and the data protocol standards are also
 2 - Compatible with NMEA 4.1 and above
 5 - Compatible with the BDS/GPS dual-mode protocol of China Transportation Information Center, 
     compatible with NMEA 2.3 and above, compatible NMEA4.0 protocol, 
     the default protocol
 9 - Compatible with single GPS NMEA0183 protocol, compatible with NMEA 2.2 version */ 
AT6558.prototype.setProtocol = function(n) {
  this.sendCommand("CAS05,"+n.toFixed(0));
  this._.protocol = n;
};

/* Query product information
  0=Query the firmware version number
  1=Query hardware model and serial number
  2=Query the working mode of the multi-mode receiver
  3=Query the customer number of the product
  5=Query upgrade code information
*/
AT6558.prototype.queryInfo = function(n) {
  this.sendCommand("CAS06,"+n.toFixed(0));
};

/* Receiver restart 
0=hot start. Do not use initialization information, back up all in the storage the data is valid.
1=Warm start. Clear the ephemeris without using the initialization information.
2=Cold start. Do not use the initialization information, clear the backup storage except all data outside the configuration.
3=Factory start. Clear all data in the memory and reset the receiver to the factory default configuration.
8=Turn off the serial port output and RF part, which can respond to the serial port configuration.
9=Enable the serial port output and radio frequency part. Corresponds to 8. */
AT6558.prototype.restart = function(n) {
  this.sendCommand("CAS10,"+n.toFixed(0));
};

exports.connect = function(id) {
    return new AT6558(id);
};


// ========= TEST and Examples ================= //
/*
require("AT6558");
gnss = new AT6558("TST");
gnss.powerOff();
//gnss.needsValidation = true;
gnss.onInfo(function(snt){print(snt);});
//gnss.onANT(function(snt){print(snt);});
//gnss.onDHV(function(snt){print(snt);});
//gnss.onGGA(function(snt){print(snt);});
//gnss.onGSA(function(snt){print(snt);});
//gnss.onGST(function(snt){print(snt);});
//gnss.onGSV(function(snt){print(snt);});
//gnss.onRMC(function(snt){print(snt);});
//gnss.onVTG(function(snt){print(snt);});
//gnss.onZDA(function(snt){print(snt);});
gnss.onChangeLocation(function(loc){print("loc:",loc," dst:",gnss.distance_loc);});
gnss.onChangeSpeed(function(speed){print("speed:",speed," dst:",gnss.distance_spd);});
//gnss.onChangeCourse(function(course){print("course:",course);});

gnss.onStartup(function(){
  // Setup
  gnss.setSystems(1,0,0);
  gnss.setSentencesAll("0");
  gnss.setSentences({RMC:"1"});
  gnss.setUpdateRate(500);
  gnss.setProtocol(2);
});

gnss.powerOn();
gnss.powerOff();

gnss.setSentences({RMC:"0"});
  
//gnss.queryInfo(5);
  
*/
