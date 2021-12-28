//WIDGETS = {}; // <-- for development only

(() => {
  function draw() {
    /*
    // sum free on-chip flash space
    var freeFlashSpace=0, maxChunk=0, sz=0;
    var freeChunks = require("Flash").getFree();
    for(let i=0; i<freeChunks.length; i++){
      sz = freeChunks[i].length;
      freeFlashSpace += sz;
      if(maxChunk < sz) maxChunk = sz;
    }
    */

    freeStorageSpace = require("Storage").getFree(); 
    var pc = Math.round((process.env.STORAGE-freeStorageSpace)*100/process.env.STORAGE);
    var x=this.x, y=this.y, w=WIDGETS.ssd.width;
    pc=48;
    var l=Math.round(pc*(w-5)/100);
    g.reset();
    g.clearRect(x, y, x+w, y+23);
    g.setColor("#0000ff");
    g.fillRect(x+2, y+2, x+w-2, y+22);
    g.clearRect(x+4, y+4, x+w-4, y+20);
    g.setColor(pc>70 ? "#ff0000" : (pc>50 ? "#ff8800" : "#0088ff"));
    g.setClipRect(x+5, y+5, x+w-5, y+19);
    g.fillRect(x+5, y+5, x+l+5, y+19);
    g.setFont("6x8",2);//.setFontAlign(0,0);
    g.setColor(pc>70?"#ffffff":"#000000");
    g.drawString(pc+"%", x+8, y+5);//, true/*solid*/);
  }

  var ssdInterval = Bangle.isLCDOn()
    ? setInterval(()=>WIDGETS.ssd.draw(), 10000)
    : undefined;

  WIDGETS["ssd"]={area:"bl", width:48, draw:draw};
})()

//Bangle.drawWidgets(); // <-- for development only