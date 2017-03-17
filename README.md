# gbemulator
Gameboy emulator in JavaScript with Walk-through

I won't re-hash Imran's excellent emulation [tutorial](http://imrannazar.com/GameBoy-Emulation-in-JavaScript:-The-CPU
). The purpose of this documentation is to outline the steps I took to build my own emulator and how I reasoned through it. The purpose of this emulator wasn't performance or best practices - it was written to be as simple as possible for ease of understanding.

To run the project:

`npm start` to run the webpack-dev-server and open up *localhost:8080* in your browser

OR

`npm build` and run your choice of server in the root of the project. The JavaScript bundle is outputted to a folder named *output* after the build succeeds.

## Emulation: A Background
Emulation is the process of mimicking hardware functionality in software. Timing, registers, opcodes, memory management - all of features of the hardware need to be replicated correctly or the end product won't work as expected. I found it quite tough to pick a place to start when I first started this emulator. Where do you even begin?

The most logical place seemed to be the processor. After all, the processor is the heart of any computer. However, the more I thought about it, the more it made sense to start with the memory architecture. The processor operates on memory (program data, BIOS, etc.), so it felt more natural. After a few attempts, it felt like I was writing a whole lot of code with not much to show. How did I even know the components I was writing were working correctly?

Obviously it's possible to build each component of the emulator one-by-one and integrate them all at the end. However, this seems like a very error-prone and tedious way of doing things. When we build the emulator, I want to try to create the bare minimum to have a functioning display as soon as possible no matter how simple it is. This will be our confirmation that things are working as expected. After this major hurdle is accomplished, we can iterate and add on to each component until we have a working emulator!

After some trial and error, it made sense to build up the CPU, memory architecture, and display components in tandem. It wasn't necessary to completely build the whole emulator before we could test it. Let's just write the bare minimum code to do run the simplest possible on the GameBoy - the BIOS. After this basic functionality is in place, the rest of the emulator should fall into place.

Before we jump in and start coding, let's step back and try to understand what happens when we turn the GameBoy. It's a lot like the process a computer uses to start up. Let's outline the computer boot process to help us understand what goes on when we flip the switch on our GameBoy.

## Boot Process
A computer contains a motherboard that houses all of the hardware components and provides an interface for them to communicate. The motherboard contains a BIOS, a ROM chip that contains a program for initializing and configuring the computer's hardware. After initialization, the BIOS will load the operating system from the hard disk so we can actually do some cool stuff using our computer.

When we turn on a computer, power is supplied to the motherboard and the CPU is switched on. The CPU's registers are set to specific default values. A special register, the 'program counter' (sometimes called 'instruction pointer'), is set to a pre-determined default - the address of the BIOS. The program counter now points at the first instruction of the BIOS program and is ready to start the boot process. The CPU will begin a series of cycles that it's destined to complete for eternity (or until it's turned off): fetch, decode, and execute.

The CPU will *fetch* an instruction from the program (pointed to by the program counter). The instruction is it receives is an 'opcode' that maps to some function within the CPU's instruction set. The CPU will decode this opcode into an instruction it understands. Finally, the CPU will *execute* the decoded instruction. This instruction could set flags/registers, read/write to memory, or perform some arithmetic, among other things. The cycle is now complete. The program counter is incremented to point to the next instruction and repeats this process ad infinitum.

The cycle is performed on the BIOS program upon boot. When the BIOS program is complete, the BIOS points the program counter to the operating system. The program counter now contains the first instruction of the operating system code. Now the operating system is the program being executed.

A GameBoy has similar architecture, though there are many small details we need to pay attention to. When a GameBoy is turned on, the registers are reset and the program counter is set to the BIOS, or 'bootstrap ROM'. The BIOS loads and displays the Nintendo logo. After the BIOS is done running, the program counter is set to the first instruction of the cartridge ROM - the game we want to play.

To start, I want to build an extremely barebones GameBoy. When/if it works, I want to add on to it. To get the GameBoy running an actual program as soon as possible, it made sense to emulate the following:

2. CPU - we don't need to implement the full CPU instruction set, just the operations used by the BIOS program
1. Memory architecture - BIOS, Video RAM
3. Display

With these components in place, we can load the BIOS and see the Nintendo logo displayed on screen just like  [this](https://www.youtube.com/watch?v=b--Ip9xZsgg).

After this extremely barebones emulator is working, we can iterate on it by adding the rest of the memory implementation, input/output, sound, and the rest of the opcodes needed for more complex games to run.

Let's talk about each of these components - their structure, quirks, and features. Then lets create the code for each component.

After we create the bare minimum functionality for each component, we'll need a container to tie them all together. We'll implement this at the end. Let's start with the processor.

## Memory Architecture
The GameBoy utilizes a 16-bit address bus, meaning there are 2^16 (64kb) bytes of addressable memory. Everything from video memory to input handling to game data is handled within 64kb of memory! Though there is 64kb of memory that we can address, not all of it is usable. Some of it is duplicated and some is inaccessible. Interestingly, some games were megabytes in size, far exceeding the (less than) 64kb of addressable memory. How did this work?

A GameBoy game is split into multiple 16kb 'banks' of memory. The first 16kb (0x3FFF kb in hex) of a cartridge's ROM is permanently-mapped to addresses 0x0000 to 0x3FFF. The second 16kb (0x4000 - 0x7FFF) of address space could reference one of the other banks of memory at a time. For example, if you developed a GameBoy game with multiple levels, you could 'switch' levels by changing the bank you're currently addressing. Switching this bank was handled by a Memory Bank Controller.

The 64kb of memory is divided as follows (byte ranges in hex):

### 0x0000 - 0x3FFF: Permanently-mapped ROM bank
The first 16kb of a cartridge are always available in this address space. In practice, this section of the ROM contains the game engine and common routines.

### 0x4000 - 0x7FFF: Switchable ROM bank
This 16kb section of memory could address one of the 16kb 'banks' of switchable cartridge ROM. The current ROM bank it's pointing to is controlled by the cartridge's Memory Bank Controller.

### 0x8000 - 0x9FFF: Video RAM
This 8kb of addressable memory is reserved for the video RAM, which holds sprites and graphics. It is also called the 'tile map' because it holds

### 0xA000 - 0xBFFF: Cartridge (External) RAM
If there is RAM available on the cartridge, it is addressable in this address space.

### 0xC000 - 0xCFFF and 0xD000 - 0xDFFF: Working RAM
Internal, working RAM used for temporary storage (and other things you use RAM for).

### 0xE000 - 0xFDFF: Reserved
This almost 8k of RAM is reserved and should not be modified. Internally, it's a shadow of the Working RAM, but Nintendo advises not to work with this area of memory.

### 0xFE00 - 0xFE9F: OAM (Object Attribute Memory) or 'Sprite/Tile Information'
This section of memory is used to store positions of tiles/sprites on the screen, as well as their attributes.

### 0xFF00 - 0xFF7F: Hardware I/O
The LCD Display, sound, link cable, internal timers, and joypad/buttons were all managed in this section of memory.

### 0xFF80 - 0xFFFE: Zero Page RAM
This 128 byte section of memory is used for storage of variables that the programmer needs quick access to.

### 0xFFFF Interrupt Enable Register
A special memory location for the interrupt enable register.

You might notice that a section is missing. Where do addresses 0xFEA0 to 0xFEFF resolve? This section of memory is unused, so it's safely omitted.

This memory map defines the structure of the memory architecture we'll be implementing. Instead of coding up every one of these sections, let's start with the bare minimum to get the Nintendo logo to display on screen - the memory architecture 'container', the BIOS, and the Video RAM. Next we'll create the hardware I/O memory section. Hardware I/O is necessary for the BIOS to run to completion. The BIOS (and GameBoy games) depend on timing information from this section of memory, so without it our program will infinitely loop.

Next create the processor, its registers, and the opcodes it needs to run the BIOS program. Finally, we'll implement the display - both in memory and the actual display we'll use to run it in the browser.

## MMU
The MMU (memory management unit) is what we will call the interface to all of these different memory components we will create. By themselves, the memory units can be thought of as nothing but bit buckets - simple arrays containing bytes. When the CPU reads an opcode and decodes it to an instruction, it's possible that the instruction needs to read from or write to one of these sections of memory. The MMU will will receive the command to read or write along with a memory address. If something needs to be written to memory, the value will be passed in as well. The MMU will make sure the correct section of memory is read from or written to using the memory map we defined above.

There are four possible commands the MMU can receive: read a byte from a section of memory, write a byte to a section of memory, read a word (two bytes) from a section of memory, and write a word from a section of memory.

Let's create the interface and skeleton for the MMU:

```
import defaultBios from './bios';

class MMU {
    zeroPage = [];
    bios = defaultBios;

    readByte(address) {
        let valueAtAddress;
        if(address <= 0x7FFF) {
            return this.bios[address];
        } else if(address >= 0x8000 && address <= 0x9FFF) {
            throw new Error('Not yet implemented');//cartridge external RAM
        } else if(address >= 0xA000 && address <= 0xBFFF) {
            throw new Error('Not yet implemented');//cartridge external RAM
        } else if(address >= 0xC000 && address <= 0xDFFF) {
            throw new Error('Not yet implemented');//working RAM
        } else if(address >= 0xE000 && address <= 0xFDFF) {
            throw new Error('Not yet implemented');//(reserved) working RAM shadow
        } else if(address >= 0xFE00 && address <= 0xFE9F) {
            throw new Error('Not yet implemented');//oam
        } else if(address >= 0xFF00 && address <= 0xFF7F) {
            throw new Error('Not yet implemented');//io
        } else if(address >= 0xFF80 && address <= 0xFFFE) {
            return this.zeroPage[address - 0xFF00];
        }
        return valueAtAddress;
    }

    readSignedByte(address) {
        let value = this.readByte(address);
        if(value > 127) {
            value = -((~value + 1) & 255);
        }
        return value;
    }

    writeByte(address, value) {
        if(address <= 0x7FFF) {
            //cartridge memory
        } else if(address >= 0x8000 && address <= 0x9FFF) {
            throw new Error('Not yet implemented');//cartridge external RAM
        } else if(address >= 0xA000 && address <= 0xBFFF) {
            throw new Error('Not yet implemented');//cartridge external RAM
        } else if(address >= 0xC000 && address <= 0xDFFF) {
            throw new Error('Not yet implemented');//working RAM
        } else if(address >= 0xE000 && address <= 0xFDFF) {
            throw new Error('Not yet implemented');//(reserved) working RAM shadow
        } else if(address >= 0xFE00 && address <= 0xFE9F) {
            throw new Error('Not yet implemented');//oam
        } else if(address >= 0xFF00 && address <= 0xFF7F) {
            throw new Error('Not yet implemented');//io
        } else if(address >= 0xFF80 && address <= 0xFFFE) {
            this.zeroPage[address - 0xFF00] = value;
        }
    }

    readWord(address) {
        return this.readByte(address) + (this.readByte(address + 1) << 8);
    }

    writeWord(address, value) {
        this.writeByte(address, value & 0x00FF);
        this.writeByte(address + 1, value >> 8);
    }
}
export default MMU;
```

Each read and write operation will now be mapped to the correct section of memory! All we need to do is implement each specific section of memory and add it to the correct place in the read/write methods of the MMU! We also have defined a convenience 'readSignedByte' method because some operations expect a signed byte.

Now that the MMU is defined, let's define the necessary memory regions we need to get our emulator working. We'll define some memory regions as simple arrays on the MMU class. Other memory regions are a bit more complex, so we'll create classes for them.

The default BIOS value is pretty big, we'll place it in its own file and import it.

```
export default [
    0x31, 0xFE, 0xFF, 0xAF, 0x21, 0xFF, 0x9F, 0x32, 0xCB, 0x7C, 0x20, 0xFB, 0x21, 0x26, 0xFF, 0x0E,
    0x11, 0x3E, 0x80, 0x32, 0xE2, 0x0C, 0x3E, 0xF3, 0xE2, 0x32, 0x3E, 0x77, 0x77, 0x3E, 0xFC, 0xE0,
    0x47, 0x11, 0x04, 0x01, 0x21, 0x10, 0x80, 0x1A, 0xCD, 0x95, 0x00, 0xCD, 0x96, 0x00, 0x13, 0x7B,
    0xFE, 0x34, 0x20, 0xF3, 0x11, 0xD8, 0x00, 0x06, 0x08, 0x1A, 0x13, 0x22, 0x23, 0x05, 0x20, 0xF9,
    0x3E, 0x19, 0xEA, 0x10, 0x99, 0x21, 0x2F, 0x99, 0x0E, 0x0C, 0x3D, 0x28, 0x08, 0x32, 0x0D, 0x20,
    0xF9, 0x2E, 0x0F, 0x18, 0xF3, 0x67, 0x3E, 0x64, 0x57, 0xE0, 0x42, 0x3E, 0x91, 0xE0, 0x40, 0x04,
    0x1E, 0x02, 0x0E, 0x0C, 0xF0, 0x44, 0xFE, 0x90, 0x20, 0xFA, 0x0D, 0x20, 0xF7, 0x1D, 0x20, 0xF2,
    0x0E, 0x13, 0x24, 0x7C, 0x1E, 0x83, 0xFE, 0x62, 0x28, 0x06, 0x1E, 0xC1, 0xFE, 0x64, 0x20, 0x06,
    0x7B, 0xE2, 0x0C, 0x3E, 0x87, 0xF2, 0xF0, 0x42, 0x90, 0xE0, 0x42, 0x15, 0x20, 0xD2, 0x05, 0x20,
    0x4F, 0x16, 0x20, 0x18, 0xCB, 0x4F, 0x06, 0x04, 0xC5, 0xCB, 0x11, 0x17, 0xC1, 0xCB, 0x11, 0x17,
    0x05, 0x20, 0xF5, 0x22, 0x23, 0x22, 0x23, 0xC9, 0xCE, 0xED, 0x66, 0x66, 0xCC, 0x0D, 0x00, 0x0B,
    0x03, 0x73, 0x00, 0x83, 0x00, 0x0C, 0x00, 0x0D, 0x00, 0x08, 0x11, 0x1F, 0x88, 0x89, 0x00, 0x0E,
    0xDC, 0xCC, 0x6E, 0xE6, 0xDD, 0xDD, 0xD9, 0x99, 0xBB, 0xBB, 0x67, 0x63, 0x6E, 0x0E, 0xEC, 0xCC,
    0xDD, 0xDC, 0x99, 0x9F, 0xBB, 0xB9, 0x33, 0x3E, 0x3c, 0x42, 0xB9, 0xA5, 0xB9, 0xA5, 0x42, 0x4C,
    0x21, 0x04, 0x01, 0x11, 0xA8, 0x00, 0x1A, 0x13, 0xBE, 0x20, 0xFE, 0x23, 0x7D, 0xFE, 0x34, 0x20,
    0xF5, 0x06, 0x19, 0x78, 0x86, 0x23, 0x05, 0x20, 0xFB, 0x86, 0x20, 0xFE, 0x3E, 0x01, 0xE0, 0x50
];
```

Each of these values is an opcode that can be translated [here](http://pastraiser.com/cpu/gameboy/gameboy_opcodes.html) to get the actual operations the CPU is doing. The full disassembly can be found (with comments) [here](https://gist.github.com/drhelius/6063288).

Let's also define the zero page RAM. Because it can be thought of as an array of memory, we'll simply define it as an array member on the MMU class. We'll import and initialize the BIOS here as well.

```
import defaultBios from './bios';

class MMU {
    zeroPage = [];
    bios = defaultBios;
    ...
}
```

Finally, we'll drop in the BIOS, and zero page RAM into their proper locations into the MMU. Before we move to the processor, we'll need to implement the GPU. For now, we won't concern ourselves with how to actually display anything in the browser. Let's just focus on the in-memory implementation.

## GPU
The GPU is responsible for writing pixels to the LCD screen. It's similar to cathode ray tube technology in its process. The LCD screen consists of 144 lines that are 160 pixels wide. There are actually 153 lines, but 8 aren't visible.

The contents of what to draw on the screen is kept in memory in separate sections of the memory map. - the video memory and the object attribute memory. Video memory contains the tiles and sprites that can be drawn by the game. Object attribute memory contains the positions of the tiles and sprites.

To draw the frame, start at the very top left corner of the screen at the first pixel of the first line. Set memory location that holds the current line, 0xFF44 in hardware I/O, to zero. One-by-one, draw each of the 160 pixels in the current line with the correct color. Once at the end of this line, do what's called a 'horizontal blank' - set the 'draw' pointer to the beginning of the next line of pixels. Increment scan line in memory map. Repeat this process until there is no 'next' line. At this point, the image is drawn. To draw the next image, a 'vertical blank' is performed. This resets the 'draw' pointer to the top left of the screen and the draw process is repeated.

Drawing a line is not as simple as looping through an array. Remember that the GameBoy stores its tile information in video RAM and the positions of tiles in OAM, a separate section of memory. There is no pixel-for-pixel representation of the frame in memory. Each time the GameBoy draws an image, it jumps back and forth between these sections of memory and each jump takes time. Performing a horizontal or vertical blank also takes time. The timing of the GPU must be synced to the rest of the hardware or our emulator will be useless.

Each operation is represented as a GPU 'mode' (held in memory address 0xFF41 of hardware I/O) and takes a certain fixed amount of time to complete:

Mode 0: Horizontal blank, 204 clock cycles
Mode 1: Vertical blank, 456 clock cycles
Mode 2: Accessing OAM, 80 clock cycles
Mode 3: Accessing video RAM, 172 clock cycles

We can begin implementing this as follows, starting with the special GPU memory locations.

```
const HBLANK_MODE = 0;
const VBLANK_MODE = 1;
const OAM_MODE = 2;
const VRAM_MODE = 3;

const HBLANK_DURATION = 204;
const VBLANK_DURATION = 456;
const OAM_DURATION = 80;
const VRAM_DURATION = 172;

class GPU {
    mode = 0; //0XFF41
    currentLine = 0; //0xFF44
    clock = 0;

    step(lastOpDuration) {
        this.clock += lastOpDuration;

        switch(this.mode) {
            case HBLANK_MODE: {
                if(this.clock >= HBLANK_DURATION) {

                }
                break;
            }
            case VBLANK_MODE: {
                if(this.clock >= VBLANK_DURATION) {

                }
                break;
            }
            case OAM_MODE: {
                if(this.clock >= OAM_DURATION) {

                }
                break;
            }
            case VRAM_MODE: {
                if(this.clock >= VRAM_DURATION) {

                }
                break;
            }
        }
    }
}
export default GPU;
```


## Processor
The GameBoy processor is a modified Zilog Z80. It contains a number of byte and word registers. We'll go over the basics here. For a more detailed description, visit this [link](http://gameboy.mongenel.com/dmg/lesson1.html).

### Byte registers
A - accumulator register used for math operations
F - flag register that's written to after operations specified [here](http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html)
B, C, D, E, H, and L - general purpose registers

In some operations, these registers can also be grouped to form the 16-bit registers AF, BC, DE, and HL.

### Special Word Registers
There are two special registers. The first is PC, the program counter that points to the program instruction to execute.

There's also SP, the stack pointer. It points to the current position of the stack used in operations PUSH, POP, CALL, and RET.

These all comprise the CPU of the Z80. The majority of the CPU implementation will come down to defining each of the operations in the instruction set of the Z80. To begin, we'll define only the operations used in the bootstrap ROM (or BIOS). For reference, these operations are defined in the [GameBoy CPU manual](http://www.codeslinger.co.uk/pages/projects/gameboy/files/GB.pdf).

## Timing
Timing is critical for getting the emulator to run correctly. Each CPU operation takes a certain amount of time. The Gameboy tracks elapsed time in M-time and T-time. The GameBoy's CPU, as described in the first part of this series, runs on a 4,194,304Hz clock. The T-time increments with each clock step. The M-time increments at 1/4 of the speed of the t-clock.

We'll need to keep track of the time taken for each operation and the total elapsed time in order to sync our display and run our emulator at a certain speed.

## Opcodes
Opcodes are the instructions that the CPU can perform. When the program counter is loaded with an instruction from program memory (ie the instruction is *fetched*), it must be *decoded* before it can be *executed*. This 'opcode' maps to an operation that the CPU can perform. Each operation can operate on the CPU's registers or read/manipulate memory. All of these opcodes are mapped [here](http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html).

Note that the Gameboy has two opcode maps we need to implement. If the program counter reads an instruction of '0xCB', it knows the opcode is located in a special 'CB' opcode map instead of the 'regular' opcode map for all other instructions. The next instruction of the program is the opcode to decode located inside the CB opcode map.

### Bootstrap ROM
Let's implement the bare minimum opcodes to get our emulator working. We'll implement each opcode in the bootstrap ROM one by one. I've separated the bootstrap ROM into a few parts to make it more easily digestible.

Notice the array in the comment on each line. This array contains the actual ROM code for the instruction on that line. Open up *memory/bios.js* and you'll see the full ROM.

In this first part, we'll see what happens upon initialization. The stack pointer is initialized by being set to 0xFFFE, the very top of the stack (or zero page RAM in our memory map). Notice that the stack in the GameBoy goes down in memory addresses, not up.

Upon boot, the GameBoy's RAM contains a bunch of junk data. We reset the video RAM to contain all zeros by looping through each byte of the video RAM.

Finally, the last section sets up the audio. Let's not concern ourselves with how it works. Instead let's just implement the opcodes it uses.

#### Section 1
```
    LD SP,$fffe		 ; [0x31, 0xFE, 0XFF] - Set stack pointer to FFFE (top of the stack)

    XOR A			 ; [0xAF] - Clear the A register
    LD HL,$9fff		 ; [0x21, 0xFF, 0x9F] - Load last address of Video RAM (9FFF in memory map) into the HL register
Addr_0007:           ; This subroutine clears the video RAM, starting at 9FFF and working backwards
    LD (HL-),A		 ; [0x32] - Load contents of A (zero) into the address pointed to by HL and decrement HL (ie go to the next video RAM address)
    BIT 7,H		     ; [0xCB, 0x7C] - Check the 7th bit of H - if it's zero, set the zero flag else clear the zero flag
    JR NZ, Addr_0007 ; [0x20, 0xFB] - If the zero flag is not set (ie we're still in the video ram address) jump to Addr_0007 and repeat this process

    LD HL,$ff26		; [0x21, 0x26, 0xFF] - Setup audio
    LD C,$11		; [0xOE, 0X11]
    LD A,$80		; [0x3E, 0x80]
    LD (HL-),A		; [0x32]
    LD ($FF00+C),A	; [0xE2]
    INC C			; [0x0C]
    LD A,$f3		; [0x3E, 0xF3]
    LD ($FF00+C),A	; [0xE2]
    LD (HL-),A		; [0x32]
    LD A,$77		; [0x3E, 0x77]
    LD (HL),A		; [0x77]
```

#### Section 2
In this section of the bootstrap, we're setting up the video RAM to display the Nintendo logo. Each background or window tile has a certain shade associated with it. Memory location FF47 is a special register used by the LCD hardware to define the shade of gray given to a background or window tile. For more detail, visit this [link](http://bgb.bircd.org/pandocs.htm#lcdmonochromepalettes). Basically, 0xFC is a specially chosen number used to define our 'color scheme' for the Nintendo logo.

Memory address 0x0104 is where the Nintendo logo lives on the cartridge ROM. We load that into register DE as a pointer so we can reference this address later in the code. We point register HL to address 0x8010, which within our video RAM memory.

We know where the Nintendo logo lives - refer back to our memory map to see that it lives in address space 0x0104 to 0x0134. Addr_0027 is a loop that goes through each byte of the Nintendo logo. We call a graphics subroutine on each byte twice. The subroutine located at address 0x0095 and 0x0096 of the bootstrap ROM rotates and scales the byte in memory. We'll talk more about this routine when we get to it in section 5. After this subroutine is called twice on the byte, we increment our pointer to get to the next byte of the Nintendo logo. We then check if we're at the end of the logo (0x0134). If not, we continue looping. After the loop is finished, notice that register HL is still pointing to video RAM.

If we're done with the Nintendo logo, we enter a loop that copies a byte over to video RAM 8 times. The result of this loop is is the registered trademark symbol that appears next to the Nintendo logo.

```
    LD A,$fc		    ; [0x3E, 0xFC] - load 0xFC into A to initialize the color palette
    LD ($FF00+$47),A	; [0xE0, 0x47] - Set the color register to 0xFC

    LD DE,$0104		    ; [0x11, 0x04, 0x01] - Use DE as a pointer to memory location 0x104 - the location of the Nintendo logo in our memory map
    LD HL,$8010		    ; [0x21, 0x10, 0x80] - Use HL as a pointer to address 0x8010 - a section of our video RAM
Addr_0027:
    LD A,(DE)		    ; [0x1A] - Load A with the first byte of the Nintendo logo
    CALL $0095		    ; [0xCD, 0x95, 0x00] - Call subroutine at address 95 of the BIOS to scale the current byte
    CALL $0096		    ; [0xCD, 0x96, 0x00] - After returning, call subroutine at address 96 of the BIOS 'again' to scale the byte a second time (skipping the first instruction)
    INC DE		        ; [0x13] - Move to the next byte of the Nintendo logo
    LD A,E		        ; [0x7B] - Load the low byte of the current address into A
    CP $34		        ; [0xFE, 0x34] - Are we at the end of the Nintendo logo (address 0x0134)
    JR NZ, Addr_0027	; [0x20, 0xF3] - If we are not at the end (result of comparison was 'false'), loop through again.

    LD DE,$00d8		    ; [0x11, 0xD8, 0x00]
    LD B,$08		    ; [0x06, 0x08] - Set loop counter B to 8
Addr_0039:
    LD A,(DE)    		; [0x1A]
    INC DE		        ; [0x13]
    LD (HL+),A		    ; [0x22]
    INC HL		        ; [0x23]
    DEC B			    ; [0x05] Decrement loop counter
    JR NZ, Addr_0039	; [0x20, 0xF9] If we haven't looped through 8 times, keep looping
```

#### Section 3
We won't go too much into detail for the following sections. The code gets a bit nebulous, so we'll just talk about them high level. This section of code sets up the GameBoy's video memory or 'tile map'. The tile map is a section of memory that the GameBoy uses to get around it's 8kb memory limitation. Rather than define every pixel on screen, it uses a map of tiles to draw reusable blocks, saving a lot of memory.

```
    LD A,$19		; [0x3E, 0x19]  Setup background tilemap
    LD ($9910),A	; [0xEA, 0x10, 0x99]
    LD HL,$992f		; [0x21, 0x2F, 0x99]
Addr_0048:
    LD C,$0c		; [0x0E, 0x0C]
Addr_004A:
    DEC A			; [0x3D]
    JR Z, Addr_0055	; [0x28]
    LD (HL-),A		; [0x32]
    DEC C			; [0x0D]
    JR NZ, Addr_004A	; [0x20, 0xF9]
    LD L,$0f		; [0x2E, 0x0F]
    JR Addr_0048	; [0x18, 0xF3]
```

#### Section 4
This section actually turns on the LCD screen and scrolls the logo that was previously written to Video RAM on the screen. There is also some timing magic that plays the two startup tones at a certain time. This section depends on the GPU timings to be set up correctly in the hardware I/O memory map.

```
; === Scroll logo on screen, and play logo sound===

Addr_0055:
    LD H,A		    ; [0x67]  Initialize scroll count, H=0
    LD A,$64		; [0x3E, 0x64]
    LD D,A		    ; [0x57]  set loop count, D=$64
    LD ($FF00+$42),A	   ; [0xE0, 0x42]  Set vertical scroll register
    LD A,$91		       ; [0x3E, 0x91]
    LD ($FF00+$40),A	   ; [0xE0, 0x40]  Turn on LCD, showing Background
    INC B			; [0x04]
Addr_0060:
    LD E,$02		; [0x1E, 0x02]
Addr_0062:
    LD C,$0c		; [0x0E, 0x0C]
Addr_0064:
    LD A,($FF00+$44)	; [0xF0, 0x44] Grab the current GPU scan line from hardware i/o
    CP $90		; [0xFE, 0x90]
    JR NZ, Addr_0064	; [0x20, 0xFA]
    DEC C			; [0x0D]
    JR NZ, Addr_0064	; [0x20, 0xF7]
    DEC E			; [0x1D]
    JR NZ, Addr_0062	; [0x20, 0xF2]

    LD C,$13		; [0x0E, 0x13]
    INC H			; [0x24]  increment scroll count
    LD A,H		; [0x7C]
    LD E,$83		; [0x1E, 0x83]
    CP $62		; [0xFE, 0x62]  $62 counts in, play sound #1
    JR Z, Addr_0080	; [0x28, 0x06]
    LD E,$c1		; [0x1E, 0xC1]
    CP $64		; [0xFE, 0x64]
    JR NZ, Addr_0086	; [0x20, 0x06]  $64 counts in, play sound #2

Addr_0080:
    LD A,E		; [0x7B]  play sound
    LD ($FF00+C),A	; [0xE2]
    INC C			; [0x0C]
    LD A,$87		; [0x3E, 0x87]
    LD ($FF00+C),A	; [0xF2] ------- possible error in original transcription here. command is F2 not E2
Addr_0086:
    LD A,($FF00+$42)	; [0xF0, 0x42]
    SUB B			; [0x90]
    LD ($FF00+$42),A	; [0xE0, 0x42]  scroll logo up if B=1
    DEC D			; [0x15]  
    JR NZ, Addr_0060	; [0x20, 0xD2]

    DEC B			; [0x05]  set B=0 first time
    JR NZ, Addr_00E0	; [0x20, 0x4F]    ... next time, cause jump to "Nintendo Logo check"

    LD D,$20		; [0x16, 0x20]  use scrolling loop to pause
    JR Addr_0060	; [0x18, 0xCB]
```

#### Section 5
This section contains the subroutine used in section1 to scale and rotate the Nintendo logo in memory. This section also contains some checksum confirmations that compare the cartridge ROM's Nintendo logo data with the data the bootstrap ROM contains. If the comparison fails, the GameBoy is in a bad state. Presumably this was done to prevent data corruption or pirated games. If the logo comparison fails, the GameBoy locks up. Another checksum that uses the Nintendo logo bytes and cartridge header information is performed. If the sum doesn't add up to 0, the GameBoy will lock up. If these checks pass, the last two lines of the bootstrap ROM effectively remove the bootstrap ROM from memory so the memory location can be utilized by the cartridge ROM instead of being hogged by the bootstrap ROM. Finally, the last instruction of the bootstrap ROM is at position 0xFE, meaning the program counter is now pointing to address 0xFE in the memory map. Once the last instruction executes, the program counter will now contain 0x100. This address contains the first instruction of the cartridge ROM program. Execution of the cartridge program begins at this point.


```
; ==== Graphic routine ====

    LD C,A		; [0x4F]  "Double up" all the bits of the graphics data
    LD B,$04		; [0x06, 0x04]     and store in Video RAM
Addr_0098:
    PUSH BC		; [0xC5]
    RL C			; [0xCB, 0x11]
    RLA			; [0x17]
    POP BC		; [0xC1]
    RL C			; [0xCB, 0x11]
    RLA			; [0x17]
    DEC B			; [0x05]
    JR NZ, Addr_0098	; [0x20, 0xF5]
    LD (HL+),A		; [0x22]
    INC HL		; [0x23]
    LD (HL+),A		; [0x22]
    INC HL		; [0x23]
    RET			; [0xC9]

Addr_00A8:
;Nintendo Logo
.DB $CE,$ED,$66,$66,$CC,$0D,$00,$0B,$03,$73,$00,$83,$00,$0C,$00,$0D
.DB $00,$08,$11,$1F,$88,$89,$00,$0E,$DC,$CC,$6E,$E6,$DD,$DD,$D9,$99
.DB $BB,$BB,$67,$63,$6E,$0E,$EC,$CC,$DD,$DC,$99,$9F,$BB,$B9,$33,$3E

Addr_00D8:
;More video data
.DB $3C,$42,$B9,$A5,$B9,$A5,$42,$3C

; ===== Nintendo logo comparison routine =====


 0x3E, 0x01, 0xE0, 0x50

Addr_00E0:
    LD HL,$0104		; [0x21, 0x01, 0x01]	; point HL to Nintendo logo in cart
    LD DE,$00a8		; [0x11, 0xA8, 0x00]	; point DE to Nintendo logo in DMG rom

Addr_00E6:
    LD A,(DE)		; [0x1A]
    INC DE		; [0x13]
    CP (HL)		; [0xBE]	;compare logo data in cart to DMG rom
    JR NZ,$fe		; [0x20, 0xFE]	;if not a match, lock up here
    INC HL		; [0x23]
    LD A,L		; [0x7D]
    CP $34		; [0xFE, 0x34]	;do this for $30 bytes
    JR NZ, Addr_00E6	; [0x20, 0xF5]

    LD B,$19		; [0x06, 0x19]
    LD A,B		; [0x78]
    Addr_00F4:
    ADD (HL)		; [0x86]
    INC HL		; [0x23]
    DEC B			; [0x05]
    JR NZ, Addr_00F4	; [0x20, 0xFB]
    ADD (HL)		; [0x86]
    JR NZ,$fe		; [0x20, 0xFE]	; if $19 + bytes from $0134-$014D  don't add to $00
                        ;  ... lock up

    LD A,$01		; $[0x3E, 0x01]
    LD ($FF00+$50),A	; [0xE0, 0x50]	;turn off DMG rom
```

## Program Shell
Now that we've defined the opcodes for the bootstrap ROM, let's create the entry point of our application. It won't show anything useful on screen, but it will serve as a place in which we can load ROMs and control the running of the GameBoy. We provide an 'interface' for the browser to use via the window object. That way, we can easily call the GameBoy commands from our HTML.

```
import Z80 from './cpu/Z80';
class GameBoy {
    z80 = new Z80();
    clock = { m: 0, t: 0 };

    loadGame() {
    }

    loop() {
        const z80 = this.z80;
        const clock = this.clock;

        clock.m += z80.m;
        clock.t += z80.t;

        z80.step();
        z80.printDebug();
    }
}

const gameBoy = new GameBoy();
window.gameBoy = gameBoy;
gameBoy.loadGame();
```

## References
https://wornwinter.wordpress.com/tag/assembler/
http://imrannazar.com/GameBoy-Emulation-in-JavaScript:-The-CPU
https://github.com/CTurt/Cinoop/blob/990e7d92b759892e98a450b4979e887865d6757f/source/cpu.c
http://imrannazar.com/GameBoy-Z80-Opcode-Map
http://bgb.bircd.org/pandocs.htm
http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html
http://www.codeslinger.co.uk/pages/projects/gameboy/beginning.html
http://www.codeslinger.co.uk/pages/projects/gameboy/files/GB.pdf
http://www.phy.davidson.edu/FacHome/dmb/py310/Z80.Instruction%20set.pdf
http://www.idt.mdh.se/utbildning/exjobb/files/TR1234.pdf
