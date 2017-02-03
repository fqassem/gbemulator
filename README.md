# gbemulator
Gameboy emulator in JavaScript with Walk-through

I won't re-hash Imran's excellent emulation [tutorial](http://imrannazar.com/GameBoy-Emulation-in-JavaScript:-The-CPU
). The purpose of this documentation is to outline the steps I took to build my own emulator and how I reasoned through it. The purpose of this emulator wasn't performance or best practices - it was written to be as simple as possible for ease of understanding.

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
This 8kb of addressable memory is reserved for the video RAM, which holds sprites and graphics.

### 0xA000 - 0xBFFF: Cartridge (External) RAM
If there is RAM available on the cartridge, it is addressable in this address space.

### 0xC000 - 0xCFFF and 0xD000 - 0xDFFF: Working RAM
Internal, working RAM used for temporary storage (and other things you use RAM for).

### 0xE000 - 0xFDFF: Reserved
This almost 8k of RAM is reserved and should not be modified. Internally, it's a shadow of the Working RAM, but Nintendo advises not to work with this area of memory.

### 0xFE00 - 0xFE9F: OAM (Object Attribute Memory) or 'Sprite Information'
This section of memory is used to store sprite positions on the screen, as well as their attributes.

### 0xFF00 - 0xFF7F: I/O
The LCD Display, sound, link cable, internal timers, and joypad/buttons were all managed in this section of memory.

### 0xFF80 - 0xFFFE: Zero Page RAM
This 128 byte section of memory is used for storage of variables that the programmer needs quick access to.

### 0xFFFF Interrupt Enable Register
A special memory location for the interrupt enable register.

The eagle-eyed of you will notice a section is missing. Where do addresses 0xFEA0 to 0xFEFF resolve? This section of memory is unused, so it's safely omitted.

This memory map defines the structure of the memory architecture we'll be implementing. Instead of coding up every one of these sections, let's start with the bare minimum to get the Nintendo logo to display on screen - the memory architecture 'container', the BIOS, and the Video RAM. Next we'll create the processor, its registers, and the opcodes it needs to run the BIOS program. Finally, we'll implement the display - both in memory and the actual display we'll use to run it in the browser.

## MMU
The MMU (memory management unit) is what we will call the interface to all of these different memory components we will create. By themselves, the memory units can be thought of as nothing but bit buckets - simple arrays containing bytes. When the CPU reads an opcode and decodes it to an instruction, it's possible that the instruction needs to read from or write to one of these sections of memory. The MMU will will receive the command to read or write along with a memory address. If something needs to be written to memory, the value will be passed in as well. The MMU will make sure the correct section of memory is read from or written to using the memory map we defined above.

There are four possible commands the MMU can receive: read a byte from a section of memory, write a byte to a section of memory, read a word (two bytes) from a section of memory, and write a word from a section of memory.

Let's create the interface and skeleton for the MMU:

```
class MMU {
    readByte(address) {
        let valueAtAddress;
        if(address <= 0x7FFF) {
            //cartridge memory
        } else if(address >= 0x8000 && address <= 0x9FFF) {
            //video RAM
        } else if(address >= 0xA000 && address <= 0xBFFF) {
            //cartridge external RAM
        } else if(address >= 0xC000 && address <= 0xDFFF) {
            //working RAM
        } else if(address >= 0xE000 && address <= 0xFDFF) {
            //(reserved) working RAM shadow
        } else if(address >= 0xFE00 && address <= 0xFE9F) {
            //oam
        } else if(address >= 0xFF00 && address <= 0xFF7F) {
            //io
        } else if(address >= 0xFF80 && address <= 0xFFFE) {
            //zero page ram
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
            //video RAM
        } else if(address >= 0xA000 && address <= 0xBFFF) {
            //cartridge external RAM
        } else if(address >= 0xC000 && address <= 0xDFFF) {
            //working RAM
        } else if(address >= 0xE000 && address <= 0xFDFF) {
            //(reserved) working RAM shadow
        } else if(address >= 0xFE00 && address <= 0xFE9F) {
            //oam
        } else if(address >= 0xFF00 && address <= 0xFF7F) {
            //io
        } else if(address >= 0xFF80 && address <= 0xFFFE) {
            //zero page ram
        }
    }

    readWord(address) {
        return readByte(address) + (readByte(address + 1) << 8);
    }

    writeWord(address, value) {
        writeByte(address, value & 0x00FF);
        writeByte(address + 1, value >> 8);
    }
}
export default MMU;
```

Each read and write operation will now be mapped to the correct section of memory! All we need to do is implement each specific section of memory and add it to the correct place in the read/write methods of the MMU! We have defined a convenience 'readSignedByte' method because some operations expect a signed byte.

Now that the MMU is defined, let's define the necessary memory regions we need to get our emulator working. We'll define the memory regions as simple arrays on the MMU class. However, because the default BIOS value is enormous, we'll place it in its own file and import it.

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

Let's also define the video RAM. Because the video ram can be thought of as an array of memory, we'll simply define it as an array member on the MMU class. We'll import and initialize the BIOS as well.

```
import defaultBios from './bios';

class MMU {
    vram = [];
    bios = defaultBios;
    ...
}
```

Finally, we'll drop in the BIOS and video ram into their proper locations into the MMU. Now, the memory architecture is, believe it or not, complete. This is all we need to create a barebones Gameboy memory implementation.

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
