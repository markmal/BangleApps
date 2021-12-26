/* Copyright (c) 2021 Mark Malakanov. See the file LICENSE for copying permission. */
/*
AT6558
Provides functions, controls, settings for AT6558 based GNSS module.
It incapsulates Bangle.GPS
See usage examples at the bottom 
*/


function AT6558(id){
  this.id = id;
  this.acturer = "";
  this.IC = "";
  this.SW = "";
  this.build_time = "";
  this.mode = "";
  AT6558.prototype.serialBaudRate = 9600; 
  AT6558.prototype.baudRate = 9600;  
  this.updateRate = NaN;
  this.needsValidation = false;
  this.ActiveSats=[];
  this.ViewSats=[];
  this.distance_loc = 0.0;
  this.distance_spd = 0.0;
  this.TZ = "00:00";
  this.distSpdSOG = NaN;
  this.distLocTime = new Date();
  this.isStartUp = false;
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
     && !isNaN(prev.lat) && !isNaN(this.lat)
     && !isNaN(prev.lon) && !isNaN(this.lon)
     && (prev.lat != this.lat || prev.lon != this.lon)){
    this.distance_loc += this.distance(prev.lat, prev.lon, this.lat, this.lon);
    this.chngLocTime = this.datetime;
  }
};

// Increment distance from average speed in the period.
AT6558.prototype.addDistSpd = function(){
  if(!isNaN(this.SOG_km) && this.datetime
       && this.datetime != this.distSpdTime) {
    if(!this.distSpdTime) this.distSpdTime = this.datetime;
    if(isNaN(this.distSpdSOG)) this.distSpdSOG = this.SOG_km;
    this.distance_spd += 0.5*(this.distSpdSOG+this.SOG_km)/3.6 * (this.datetime-this.distSpdTime)*0.001; // m
    this.distSpdSOG = this.SOG_km;
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

AT6558.prototype.hndlInfo = function(sntc) {
  var txt = sntc.substr(15,255);
  var fld = txt.substr(0,3);
  var val = txt.substr(3,255);
  if(fld == "MA=") this.manufacturer = val; 
  if(fld == "IC=") this.IC = val;
  if(fld == "SW=") this.SW = val;
  if(fld == "TB=") this.buildTime = val; 
  if(fld == "MO=") this.mode = val;
  if(this.mode && this.cbInfo) this.cbInfo({
      manufacturer:this.manufacturer, 
      ID:this.IC, SW:this.SW, buildTime:this.buildTime, mode:this.mode});
};

// ANT - Antenna Status. For Bangle2 is always Open because it has a passive antenna.
AT6558.prototype.onANT = function(callback){
  this.cbANT = callback;
};

// process amy TXT and call either ANT or Info handler
AT6558.prototype.hndlTXT = function(sntc) {
  if(sntc.substr(0,15) == "GPTXT,01,01,02,")
    this.hndlInfo(sntc);
  else {
    //print(sntc);
    if(this.cbANT) this.cbANT({
      sys: sntc.substr(0,2),
      cmd: sntc.substr(2,3),
      xx: sntc.substr(6,2),
      yy: sntc.substr(9,2),
      zz: sntc.substr(12,2),
      msg: sntc.substr(15,64)
      });
  }
};

//DHV - Design Hourly Volume. Details of GNSS receiver speeds.
AT6558.prototype.onDHV = function(callback){
  this.cbDHV = callback;
};

AT6558.prototype.hndlDHV = function(sntc) {
  //print("DHV "+sntc);
  var prev = {SOG_km:this.SOG_km, datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]) this.time = this.nmeaTtoTime(d[1]);
  this.speed3D = parseFloat(d[2]);
  this.spdX = parseFloat(d[3]);
  this.spdY = parseFloat(d[4]);
  this.spdZ = parseFloat(d[5]);
  this.spdG = parseFloat(d[6]); // m/s
  this.SOG_km = this.spdG * 3.6;
  if(this.time && this.date) 
    this.datetime = new Date(this.date+"T"+this.time+"+"+this.TZ);

  this.addDistSpd();

  if(this.cbDHV) this.cbDHV({
    sys: this.sys,
    time: this.time,
    speed3D: this.speed3D,
    spdX: this.spdX,
    spdY: this.spdY,
    spdZ: this.spdZ,
    spdG: this.spdG
    });
};


// GGA - Fix Data
AT6558.prototype.onGGA = function(callback){
  this.cbGGA = callback;
};

AT6558.prototype.hndlGGA = function(sntc) {
  //print("GGA "+sntc);
  var prev = {lat:this.lat, lon:this.lon, datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]) this.time = this.nmeaTtoTime(d[1]);
  this.lat = this.nmeaAtoAngle(d[2],d[3]);
  this.lon = this.nmeaAtoAngle(d[4],d[5]);
  this.FS = parseInt(d[6]);
  this.numSV = parseInt(d[7]);
  this.HDOP = parseFloat(d[8]);
  this.MSL = parseFloat(d[9]);
  //this.uMSL = d[10];
  this.sep = parseFloat(d[11]);
  //this.uSep = d[12];
  this.diffAge = parseFloat(d[13]);
  this.diffSta = parseFloat(d[14]);
  if(this.time && this.date) 
    this.datetime = new Date(this.date+"T"+this.time+"+"+this.TZ);

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this.lat) 
     && (prev.lat != this.lat || prev.lon != this.lon)){
    this.cbChngLoc({lat:this.lat, lon:this.lon});
  }

  if(this.cbGGA) this.cbGGA({
    sys: this.sys,
    time: this.time,
    lat: this.lat,
    lon: this.lon,
    FS: this.FS,
    numSV: this.numSV,
    HDOP: this.HDOP,
    MSL: this.MSL,
    sep: this.sep,
    diffAge: this.diffAge,
    diffSta: this.diffSta
    });
};

// GLL - Geographic Position-Latitude/Longitude
AT6558.prototype.onGLL = function(callback){
  this.cbGLL = callback;
};

AT6558.prototype.hndlGLL = function(sntc) {
  //print("GLL: "+sntc);
  var prev = {lat:this.lat, lon:this.lon, datetime:this.datetime};
  var d = sntc.split(",");
  this.lat = this.nmeaAtoAngle(d[1],d[2]);
  this.lon = this.nmeaAtoAngle(d[3],d[4]);
  if(d[5]) this.time = this.nmeaTtoTime(d[5]);
  this.status = d[6];
  this.mode = d[7];
  if(this.time && this.date) 
    this.datetime = new Date(this.date+"T"+this.time+"+"+this.TZ);

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this.lat) 
     && (Math.abs(prev.lat - this.lat) >= this.sensitivityLoc 
      || Math.abs(prev.lon - this.lon) >= this.sensitivityLoc)){
    this.cbChngLoc({lat:this.lat, lon:this.lon});
  }

  if(this.cbGLL) this.cbGLL({
    sys: this.sys,
    lat: this.lat,
    lon: this.lon,
    time: this.time,
    status: this.status,
    mode: this.mode
    });
};

// GSA - GNSS DOP and Active Satellites 
AT6558.prototype.onGSA = function(callback){
  this.cbGSA = callback;
};

AT6558.prototype.hndlGSA = function(sntc) {
  //print("GSA: "+sntc);
  var d = sntc.split(",");
  this.Smode = d[1];
  this.FS = d[2];
  this.systemId=d[18];
  var sid=parseInt(this.systemId)-1;
  this.ActiveSats[sid]=[d[3],d[4],d[5],d[6],d[7],d[8],d[9],d[10],d[11],d[12],d[13],d[14]];
  this.PDOP=d[15];
  this.HDOP=d[16];
  this.VDOP=d[17];
  
  if(this.cbGSA) this.cbGSA({
    sys: this.sys,
    Smode: this.Smode,
    FS: this.FS,
    ActiveSats: this.ActiveSats,
    PDOP: this.PDOP,
    HDOP: this.HDOP,
    VDOP: this.VDOP,
    systemId: this.systemId
    });
};

// GST - GNSS Pseudorange Error Statistics
AT6558.prototype.onGST = function(callback){
  this.cbGST = callback;
};

AT6558.prototype.hndlGST = function(sntc) {
  print("GST "+sntc);
  var d = sntc.split(",");
  if(d[1]) this.time = this.nmeaTtoTime(d[1]);
  this.RMS = parseFloat(d[2]);
  this.stdDevMaj = parseFloat(d[3]);
  this.stdDevMin = parseFloat(d[4]);
  this.orientation = parseFloat(d[5]);
  this.stdLat = parseFloat(d[6]);
  this.stdLon = parseFloat(d[7]);
  this.stdAlt = parseFloat(d[8]);
  if(this.time && this.date) 
    this.datetime = new Date(this.date+"T"+this.time+"+"+this.TZ);

  if(!isNaN(this.RMS) && this.cbGST) this.cbGST({
    sys: this.sys,
    RMS: this.RMS,
    stdDevMaj: this.stdDevMaj,
    stdDevMin: this.stdDevMin,
    orientation: this.orientation,
    stdLat: this.stdLat,
    stdLon: this.stdLon,
    stdAlt: this.stdAlt
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
  if(!this.ViewSats[this.sys]) this.ViewSats[this.sys]=[];
  var i=4; var n=d.length-1;
  while(i < n){
    var vs={SVId:d[i++], Ele:d[i++], Az:d[i++], cn0:d[i++]};
    this.ViewSats[this.sys][this.GSV_Sn] = vs;
    this.GSV_Sn++;
  }
  this.signalId = d[i];

  if(msgNo==numMsg && this.cbGSV) this.cbGSV({
    sys: this.sys,
    ViewSats: this.ViewSats,
    signalId: this.signalId
    });
};

// RMC - Recommended Minimum Navigation Information
AT6558.prototype.onRMC = function(callback){
  this.cbRMC = callback;
};

AT6558.prototype.hndlRMC = function(sntc) {
  //print("RMC "+sntc);
  var prev = {lat:this.lat, lon:this.lon, 
              SOG_km:this.SOG_km, COG:this.COG, 
              datetime:this.datetime};
  var d = sntc.split(",");
  if(d[1]&&d[9]) this.datetime = this.nmeaDTtoDateTime(d[9],d[1]);
  if(d[1]) this.time = this.nmeaTtoTime(d[1]);
  this.status = d[2];
  this.lat = this.nmeaAtoAngle(d[3],d[4]);
  this.lon = this.nmeaAtoAngle(d[5],d[6]);
  this.SOG_kn = parseFloat(d[7]);
  this.SOG_km = 1.852 * this.SOG_kn;
  this.COG = parseFloat(d[8]);
  if(d[9]) this.date = this.nmeaDtoDate(d[9]);
  this.MV = this.nmeaAtoAngle(d[10],d[11]);
  this.mode = d[12];
  this.navStatus = d[13];

  this.addDistLoc(prev);
  if(this.cbChngLoc && !isNaN(prev.lat) && !isNaN(this.lat) 
     && (Math.abs(prev.lat - this.lat) >= this.sensitivityLoc 
      || Math.abs(prev.lon - this.lon) >= this.sensitivityLoc)){
    this.cbChngLoc({lat:this.lat, lon:this.lon});
  }

  this.addDistSpd();
  if(this.cbChngSpd && !isNaN(this.SOG_km) 
    && Math.abs(prev.SOG_km - this.SOG_km) >= this.sensitivitySpd ){
    this.cbChngSpd(this.SOG_km);
  }

  if(this.cbChngCrs && !isNaN(this.COG) 
    && Math.abs(prev.COG - this.COG) >= this.sensitivityCrs )
    this.cbChngCrs(this.COG);

  if(this.cbRMC) this.cbRMC({
    sys: this.sys,
    datetime: this.datetime,
    time: this.time,
    status: this.status,
    lat: this.lat,
    lon: this.lon,
    SOG_kn: this.SOG_kn,
    COG: this.COG,
    date: this.date,
    MV: this.MV,
    mode: this.mode,
    navStatus: this.navStatus
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
  this.COG = parseFloat(d[1]);
  this.COGM = parseFloat(d[3]);
  this.SOG_kn = parseFloat(d[5]);
  this.SOG_km = parseFloat(d[7]);
  this.mode = d[9];

  this.addDistSpd();
  if(this.cbChngSpd && !isNaN(this.SOG_km) 
    && Math.abs(prev.SOG_km - this.SOG_km) >= this.sensitivitySpd ){
    this.cbChngSpd(this.SOG_km);
  }
  if(this.cbChngCrs && !isNaN(this.COG) 
    && Math.abs(prev.COG - this.COG) >= this.sensitivityCrs )
    this.cbChngCrs(this.COG);

  if(!isNaN(this.SOG_kn) && this.cbVTG) this.cbVTG({
    sys: this.sys,
    COGT: this.COGT,
    COGM: this.COGM,
    SOG_kn: this.SOG_kn,
    SOG_km: this.SOG_km,
    mode: this.mode,
    });
};

// ZDA - Time & Date
AT6558.prototype.onZDA = function(callback){
  this.cbZDA = callback;
};

AT6558.prototype.hndlZDA = function(sntc) {
  //print("ZDA "+sntc);
  var d = sntc.split(",");
  if(d[1]) this.time = this.nmeaTtoTime(d[1]);
  this.date = d[4]+"-"+d[3]+"-"+d[2];
  this.TZ = d[5]+":"+d[6];
  if(this.time && this.date) 
    this.datetime = new Date(this.date+"T"+this.time+"+"+this.TZ);

  if(this.cbZDA) this.cbZDA({
    sys: this.sys,
    datetime: this.datetime,
    time: this.time,
    date: this.date,
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
    print("Wrong checksum:",cksm);
    //this.checksum(sntc), sntc);
    return false;
  }
  if(this.cbNMEA){
    if(this.isStartUp && this.cbStartUp){ this.cbStartUp(); this.isStartUp=false;}
    this.cbNMEA(sntc);
  }
  this.sys = sntc.substr(0,2);
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
  this.serialBaudRate = baudRate;
}

function setBaudRate(br){
  if(this.serialBaudRate == this.baudRate){
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
    this.baudRate = br;
    sendCommand("CAS01," + brn);
  }
  const to1 = setTimeout(setSerial1BaudRate,1000);
}

// Set the positioning update rate in milliSec
AT6558.prototype.setUpdateRate = function(v) {
  var ur = "";
  switch (v) {
    case 100: ur = "100"; break;
    case 200: ur = "200"; break;
    case 250: ur = "250"; break;
    case 500: ur = "500"; break;
    case 1000: ur = "1000"; break;
    default: return;
  }
  updateRate = v;
  this.sendCommand("CAS02," + ur);
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
};
AT6558.prototype.setSentences = function(sents) {
  this.sendCommand("CAS03,"+(sents.GGA||'')+","+(sents.GLL||'')+","+
    (sents.GSA||'')+","+(sents.GSV||'')+","+(sents.RMC||'')+","+
    (sents.VTG||'')+","+(sents.ZDA||'')+","+(sents.ANT||'')+","+
    (sents.DHV||'')+",,"+(sents.TXT||'')+",,,"+(sents.GST||'') );
};
AT6558.prototype.setSentencesAll = function(n) {
  this.sendCommand("CAS03,"+n+","+n+","+n+","+n+","+n+","
    +n+","+n+","+n+","+n+",,"+n+",,,"+n );
};

// Configure the working system (constellations)). Set 0 or 1 for each system
AT6558.prototype.setSystems = function(nGPS, nBDS, nGLONASS) {
  var n = nGPS | 2*nBDS | 4*nGLONASS;
  this.sendCommand("CAS04,"+n.toFixed(0));
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

exports = AT6558;



// ========= TEST and Examples ================= //
/*

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
