
// ---------------------------------------------------------------
// 
//    Chip-8 Interpreter / Emulator / Virtual machine / whatever.  
//
//       Author: https://github.com/memer-s 
// 
// ---------------------------------------------------------------

let ram = new Uint8Array(0xfff + 1);
let screen = new Array();
let stack = new Uint16Array(16, 0);
let registers = new Uint8Array(16, 0);
let keyboard = new Array(16);

let I = 0;        // I register
let pc = 0x200;   // Program Counter
let sp = 0;       // Stack Pointer

let darkModeEnabled = true;
toggleDarkmode()

let dt = 0;       // Delay Timer
let st = 0;       // Sound Timer

let pp = pc;      // Variable used for determining location in memory

const fontset = [
   0xf0, 0x90, 0x90, 0x90, 0xf0, // 0
   0x20, 0x60, 0x20, 0x20, 0x70, // 1
   0xf0, 0x10, 0xf0, 0x80, 0xf0, // 2
   0xf0, 0x10, 0xf0, 0x10, 0xf0, // 3
   0x90, 0x90, 0xf0, 0x10, 0x10, // 4
   0xf0, 0x80, 0xf0, 0x10, 0xf0, // 5
   0xf0, 0x80, 0xf0, 0x90, 0xf0, // 6
   0xf0, 0x10, 0x20, 0x40, 0x40, // 7
   0xf0, 0x90, 0xf0, 0x90, 0xf0, // 8
   0xf0, 0x90, 0xf0, 0x10, 0xe0, // 9
   0xf0, 0x80, 0x80, 0x80, 0xf0, // A
   0xe0, 0x90, 0xe0, 0x90, 0xe0, // B
   0xf0, 0x80, 0x80, 0x80, 0xf0, // C
   0xe0, 0x90, 0x90, 0x90, 0xe0, // D
   0xf0, 0x80, 0xf0, 0x80, 0xf0, // E
   0xf0, 0x80, 0xf0, 0x80, 0x80  // F
]


// ---------------------------------------------------------------
// Initializing the arrays

for (let i = 0; i < 4096; i++) {
   ram[i] = 0x00;
}

for (let i = 0; i < 80; i++) {
   ram[i] = fontset[i];
}

for (let j = 0; j < 32; j++) {
   let temp = [];

   for (let i = 0; i < 64; i++) {
      temp.push(false);
   }
   screen.push(temp);
}

for (let i = 0; i < 16; i++) {
   registers[i] = 0;
}

for (let i = 0; i < 16; i++) {
   stack[i] = 0;
}

// ---------------------------------------------------------------

// Shorthand for document.getElementById();
function getById(id) {
   return document.getElementById(id);
}

function toggleDarkmode() {
   let root = document.documentElement;
   if(darkModeEnabled) {
      root.style.setProperty('--content', '#eeeeee')
      root.style.setProperty('--bg', '#f3f3f3')
      root.style.setProperty('--text-color', '#363636')
      root.style.setProperty('color-scheme', 'none')
      
      let contentElements = document.getElementsByClassName("content");

      for(let i = 0; i < contentElements.length; i++) {
         contentElements[i].classList.add("contentd");         
      }
      darkModeEnabled = false;
   } 
   else {
      root.style.setProperty('--content', '#262C34')
      root.style.setProperty('--bg', '#18181A')
      root.style.setProperty('--text-color', '#fff')
      root.style.setProperty('color-scheme', 'dark')
      
      let contentElements = document.getElementsByClassName("content");
      
      for(let i = 0; i < contentElements.length; i++) {
         contentElements[i].classList.remove("contentd");         
      }
      darkModeEnabled = true;
   }
}

// ---------------------------------------------------------------

// Used to get hex from number and inserting zeros
function formatHex(hex, nibbles) {
   let hexString = "";
   if (hex != 0 && hex != true) {
      for (let i = 0; i < nibbles; i++) {
         if (hex <= (2 ** (i * 4)) - 1) {
            hexString = hexString + "0";
         }
      }
   }
   else if (hex == true) {
      for (let i = 0; i < nibbles - 1; i++) {
         hexString += "0";
      }
      hexString += "1";
      return hexString;
   }
   else {
      for (let i = 0; i < nibbles; i++) {
         hexString += "0";
      }
      return hexString;
   }

   hexString += hex.toString(16);

   return hexString;
}

// ---------------------------------------------------------------

// reading program into memory
function readIntoMemory(buffer) {

   for (let i = 0; i < buffer.length; i++) {
      ram[i + 0x200] = buffer[i];
   }
   displayMemory()
   executeInstruction()
}

// Reseting registers, stack, screen, pc, sp, I
function resetChip8() {
   for (let i = 0; i < 16; i++) {
      registers[i] = 0;
      stack[i] = 0;
   }
   for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 32; j++) {
         screen[j][i] = false;
      }
   }
   sp = 0;
   I = 0;
   pc = 0x200;
   executeInstruction()
}

// ---------------------------------------------------------------
// Loading programs

// Loading roms from file
function dropHandler(e) {

   const file = getById("filedrop").files[0];
   if (file) {
      const reader = new FileReader();

      reader.onload = function (ev) {
         const arry = ev.target.result;
         // console.log(arry);
         readIntoMemory(new Uint8Array(arry));
      }

      reader.readAsArrayBuffer(file);
   }

   e.preventDefault();
}

function ondragoverHandler(e) {
   e.preventDefault();
}

// ---------------------------------------------------------------
// Display 256 bytes of memory

let memoryElement = getById("memory");

function displayMemory() {

   if (pp > 0xfff) {
      pp = 0xfff;
   }
   if (pp < 0x0) {
      pp = 0x0;
   }

   const location = Math.floor(pp / 256)

   getById("location").innerHTML = '<p><b onclick="pp-=255; displayMemory()">< </b>' + formatHex(location * 256, 3) + " - " + formatHex((location + 1) * 256 - 1, 3) + '<b onclick="pp+=255; displayMemory();"> ></b></p>';

   memoryElement.innerText = "";

   let newhtml = "";

   for (let i = 0; i < 8; i++) {
      newhtml += "<div>"
      for (let j = 0; j < 32; j++) {
         if ((i * 32) + j + (location * 256) == pc) {
            newhtml += '<em id="pc">'
         }
         if (ram[2] > 15) {
            newhtml += "<p>" + formatHex(ram[(i * 32) + j + (location * 256)], 2) + "</p>";
         }

         else {
            newhtml += "<p>0" + formatHex(ram[(i * 32) + j + (location * 256)], 2) + "</p>";
         }

         if ((i * 32) + j + (location * 256) == pc) {
            newhtml += "</em>"
         }
      }
      newhtml += "</div>";
      newhtml += "<br>";
   }

   memoryElement.innerHTML = newhtml;
}

// ---------------------------------------------------------------
// Display registers, stack, the other registers

// Is supposed to be used to see new values, not working rn
let oldregisters = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

function displayRegisters() {
   let lehtml = "";

   let changed = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

   for (let i = 0; i < 16; i++) {

      //console.log([registers[i], oldregisters[i]])
      if (registers[i] != oldregisters[i]) {
         changed[i] = 1;
         //console.error(i);
      }
      // console.log([i, registers[i], oldregisters[i], changed[i]])
   }
   for (let i = 0; i < 16; i++) {
      if (i % 4 == 0) {
         lehtml += "<div>";
      }
      if (changed[i] == 1) {
         lehtml += '<em class="change"><p>' + formatHex(registers[i], 2) + "</p></em>";
      }
      else {
         lehtml += "<p>" + formatHex(registers[i], 2) + "</p>";
      }
      if (i % 4 == 3) {
         lehtml += "</div>";
      }

      oldregisters[i] = registers[i]
   }

   // Thing to think about when writing js,
   // if i would have typed oldregisters = registers
   // then oldregisters would only be a reference to registers
   // Finally figured it out.
   // VERY IMPORTANT

   // console.log(lehtml);
   getById("registers").innerHTML = lehtml;
}

function displayStack() {
   let lehtml = "";
   for (let i = 0; i < 16; i++) {
      if (i % 4 == 0) {
         lehtml += "<div>";
      }
      lehtml += "<p>" + formatHex(stack[i], 3) + "</p>";
      if (i % 4 == 3) {
         lehtml += "</div>";
      }
   }
   getById("stack").innerHTML = lehtml;
}

function updateData() {
   getById("pcl").innerHTML = formatHex(pc, 3)
   getById("sp").innerHTML = formatHex(sp, 3)
   getById("ireg").innerHTML = formatHex(I, 3)
   getById("dt").innerHTML = formatHex(dt, 3)
   getById("st").innerHTML = formatHex(st, 3)
}

// ---------------------------------------------------------------
// Display

function clearDisp() {
   for (let i = 0; i < 32; i++) {
      for (let j = 0; j < 64; j++) {
         screen[i][j] = false;
      }
   }
}

const ctx = getById("c").getContext("2d");

function drawScreen(size) {
   for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
         if (screen[y][x] == true) {
            ctx.fillStyle = 'white';
            ctx.fillRect(x * size, y * size, size, size)
         }
         else {
            ctx.fillStyle = 'black';
            ctx.fillRect(x * size, y * size, size, size)
         }
      }
   }
}

drawScreen(10)

// ---------------------------------------------------------------

function executeInstruction() {
   const first = ram[pc];                 // first byte of the opcode
   const last = ram[pc + 1];              // last byte
   const nnn = ((ram[pc] << 8) + ram[pc + 1]) & 0x0fff; // last three nibbles of opcode
   const x = ram[pc] & 0x0f;              // second nibble of the opcode
   const y = (ram[pc + 1] & 0xf0) >> 4;   // third nibble of the opcode
   const n = (ram[pc + 1]) & 0x0f;        // last nibble

   pp = pc;

   displayRegisters()
   displayMemory()
   displayStack()
   updateData()

   // Determine what nibble the opcode starts with
   switch ((first & 0xf0) >> 4) {
      case 0x00:
         if (last == 0xee) {pc = stack[sp]; sp--}
         else if (last == 0xe0) {clearDisp(); pc += 2;}
         else {pc = nnn}
         break;

      case 0x01:
         pc = nnn;
         break;

      case 0x02:
         stack[sp] = nnn; sp++;
         pc += 2;
         break;

      case 0x03:
         if (registers[x] === last) {pc += 2;}
         pc += 2;
         break;

      case 0x04:
         if (registers[x] !== last) {pc += 2;}
         pc += 2;
         break;

      case 0x05:
         if (registers[x] === registers[y]) {pc += 2;}
         pc += 2;
         break;

      case 0x06:
         registers[x] = last;
         pc += 2;
         break;

      case 0x07:
         if (registers[x] + last > 256) {registers[0x0f] = true; registers[x] = (registers[x] + last) % 256}
         else {registers[x] += last;}
         pc += 2;
         break;

      case 0x08:
         switch (last & 0x0f) {
            case 0x00:
               registers[x] = registers[y];
               pc += 2;
               break;

            case 0x01:
               registers[x] |= registers[y];
               pc += 2;
               break;

            case 0x02:
               registers[x] &= registers[y];
               pc += 2;
               break;

            case 0x03:
               registers[x] ^= registers[y];
               pc += 2;
               break;

            case 0x04:
               registers[0xf] = false;
               if (registers[x] + registers[y] > 0xff) {
                  registers[0xf] = true;
               }
               registers[x] += registers[y];
               pc += 2;
               break;

            case 0x05:
               registers[0xf] = false;
               if (registers[x] - registers[y] > 0xff) {
                  registers[0xf] = true;
               }
               registers[x] -= registers[y];
               pc += 2;
               break;

            case 0x06:
               registers[x] >>= 1;
               pc += 2;
               break;

            case 0x07:
               registers[x] = registers[y] - registers[x];
               pc += 2;
               break;

            case 0x0e:
               registers[0xf] = registers[x] >> 7;
               registers[x] <<= 1;
               pc += 2;
               break;
         }
         break;

      case 0x09:
         if (registers[x] != registers[y]) {pc += 2}
         pc += 2;
         break;

      case 0x0a:
         I = nnn;
         pc += 2;
         break;

      case 0x0b:
         I = nnn;
         pc += 2
         break;

      case 0x0c:
         registers[x] = Math.floor(Math.random() * 255);
         pc += 2
         break;

      case 0x0d:
         // Display
         for (let i = 0; i < n; i++) {
            for (let j = 0; j < 8; j++) {
               let bit;
               if (((ram[I + i] << j) & 0x80) == 0x80) {bit = true}
               else {bit = false}

               // actually reverse. KEKE
               let yc = registers[x] + j;
               let xc = registers[y] + i;

               if (xc > 32) {xc -= 32}
               if (yc > 64) {yc -= 64}
               try {
                  registers[0xf] = false;
                  if (screen[xc][yc] && bit) {
                     screen[xc][yc] = false;
                  }

                  else if (screen[xc][yc] || bit) {
                     screen[xc][yc] = true;
                     registers[0xf] = true;
                  }

                  else if (!screen[xc][yc] && !bit) {
                     screen[xc][yc] = false;
                  }
               }
               catch {
                  // console.log(xc + "  " + yc)
               }
            }
         }

         // Draw screen only if the draw opcode is called
         drawScreen(10)
         pc += 2;
         break;

      case 0x0e:
         console.log("get keypress");
         pc += 2;
         break;

      case 0x0f:
         switch (last) {
            case 0x07:
               registers[x] = 0;
               pc += 2;
               break;

            case 0x0a:
               console.log("waiting for keypress");
               pc += 2;
               break;

            case 0x15:
               dt = registers[x];
               pc += 2;
               break;

            case 0x18:
               st = registers[x];
               pc += 2;
               break;

            case 0x1e:
               I = I + registers[x];
               pc += 2;
               break;

            case 0x29:
               I = x * 5
               pc += 2;
               break;

            case 0x33:
               // console.log(registers[x])
               ram[I] = (registers[x] % 1000 - registers[x] % 100) / 100;
               ram[I + 1] = (registers[x] % 100 - registers[x] % 10) / 10;
               ram[I + 2] = (registers[x] % 10 - registers[x] % 1) / 1;
               // console.log(ram[I + 0] + " " + ram[I + 1] + " " + ram[I + 2] + " ");
               pc += 2;
               break;

            case 0x55:
               for (let i = 0; i < registers[x]; i++) {
                  ram[I + i] = registers[i];
               }
               pc += 2;
               break;

            case 0x65:
               for (let i = 0; i < 16; i++) {
                  registers[i] = ram[I + i];
               }
               pc += 2;
               break;
         }
         break;
   }

   // Draw the screen every frame
   if (isrunning) {
      setTimeout(executeInstruction, getById("speed").value)
   }
}

let isrunning = false;

// displayMemory();
