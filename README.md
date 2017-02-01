# gbemulator
Gameboy emulator in JavaScript with Walk-through

I won't re-hash Imran's excellent emulation [tutorial](http://imrannazar.com/GameBoy-Emulation-in-JavaScript:-The-CPU
). The purpose of this readme is to document the steps I took to build my own emulator and how I reasoned through it.

## Emulation: A Background
<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
Emulation is basically trying to mimic hardware functionality using software. Things like timing, registers, memory management - all of these need to be replicated correctly or the end product won't work correctly. I found it quite tough to pick a place to start when I first started this emulator. Where do you even begin? The most logical place seemed to be the processor. After all, the processor is the heart of any computer. However, it made more sense to start with the memory architecture. The processor operates on memory (program data, BIOS, etc.), so it felt more natural to start there. After the memory architecture is defined, we could begin the implementation of the CPU. 

It's possible to build each component one-by-one and integrate them all at the end. However, this seems like a very error-prone way of doing things. When we build the emulator, let's try to create the bare minimum to have a functioning display as soon as possible, no matter how simple it is. This will be our confirmation that things are working as expected. After this major hurdle is accomplished, we can iterate and add on to each component until we have a working emulator!
=======
Emulation is tough. The way I understand it - we're basically trying to mimic hardware using software. Things like timing, registers, memory management - all of these need to be mimicked perfectly or the end product won't work. I found it tough to pick a place to start when I first started this emulator. Where do you even begin coding an emulator? The most logical place seemed to be the processor. After all, the processor is the heart of any computer. However, it made more sense to start with the memory architecture. The processor operates on memory (program data, BIOS, etc.), so it made more sense to me to start there. After the memory architecture is defined, we could begin the implementation of the CPU. While you could imagine the memory architecture as a black-box and jump straight into emulating the processor, this way seemed most logical to me.
>>>>>>> Initial README

Before we jump in and start coding, let's step back and try to understand what happens when we turn on our GameBoy.

## Boot Process
<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
Our computer contains a motherboard which houses all of the computer's important components and allows them to communicate. The motherboard contains a BIOS. The BIOS is a ROM chip that contains a program necessary for the initialization and configuration of our input and output devices. After initialization, the BIOS will load the operating system so we can actually do some cool stuff using our computer.

When we turn on a computer, power is supplied to the motherboard and the CPU is switched on. The CPU's registers are set to specific default values. A special register, the program counter (sometimes called 'instruction pointer'), is set to its pre-determined default - the address of the BIOS. The program counter now points at the first instruction of the BIOS program and is ready to start the boot process. The CPU will begin a series of cycles that it's destined to complete for eternity (or until it's turned off): fetch, decode, and execute.

The CPU will *fetch* an instruction from the program (pointed to by the program counter). The instruction is it receives is an 'opcode' that maps to some function within the CPU's instruction set. The CPU will decode this opcode into an instruction it understands. Finally, the CPU will *execute* the decoded instruction. The cycle is now complete. The program counter is incremented to point to the next instruction and the cycle repeats ad infinitum.

A GameBoy has very similar architecture, though there are many small details we need to pay attention to. Let's start with the GameBoy's memory components.

## Memory Architecture
The GameBoy utilizes a 16-bit address bus, meaning there are 2^16 (64k) bytes of addressable memory. Everything from video memory to input handling to game data is handled within 64k of memory! Interestingly, some games were megabytes in size, far exceeding the 64k of addressable memory. How did this work?

A GameBoy game is split into multiple 16kb 'banks' of memory. The first 16kb (0x3FFF) of a cartridge's ROM is permanently-mapped to addresses 0x0000 to 0x3FFF. The second 16kb (0x4000 - 0x7FFF) of address space could reference one of the other banks of memory at a time. For example, if you developed a GameBoy game with multiple levels, you could 'switch' levels by changing the bank you're currently addressing. Switching this bank was handled by a Memory Bank Controller.
=======
Our computer contains a motherboard, which houses all of our important components and allows them to communicate. The motherboard contains a BIOS. The BIOS is a ROM chip that contains a program necessary for the initialization and configuration of our input and output devices. After initialization, the BIOS will load the operating system so we can actually do some cool stuff using our computer.

When we turn on a computer, power is supplied to the motherboard and the CPU is switched on. The CPU's registers are set to specific default values. A special register, the program counter (sometimes called 'instruction pointer'), is set to a pre-determined default value - namely the address of the BIOS. The program counter now points at the first instruction of the BIOS program and is ready to start. The CPU will begin a series of cycles that it's destined to complete for eternity (or until it's turned off): fetch, decode, and execute.

The CPU will *fetch* an instruction from the program (pointed to by the program counter). The instruction is it receives is an 'opcode' that maps to some function within the CPU's instruction set. The CPU will decode this opcode into an instruction it understands. Finally, the CPU will *execute* the decoded instruction. The cycle is now complete. The program counter is incremented to point to the next instruction and the cycle repeats ad infinitum.

A GameBoy has very similar architecture, though there are many small details we need to pay attention to. Let's start by implementing the GameBoy's memory components.

## Memory Architecture
The GameBoy utilizes a 16-bit address bus, meaning there are 2^16 (64k) bytes of addressable memory. This means that everything from video memory to input handling to game data was handled within 64k of memory! Interestingly, some games were megabytes in size, far exceeding the 64k of addressable memory. How did this work?

A GameBoy game was split into multiple 16kb 'banks' of memory. The first 16kb (0x3FFF) of a cartridge's ROM were permanently-mapped to addresses 0x0000 to 0x3FFF. The second 16kb (0x4000 - 0x7FFF) of address space could reference one of the other banks of memory at a time. For example, if you developed a GameBoy game with multiple levels, you could 'switch' levels by switching the bank you're currently addressing. Switching this bank was handled by a Memory Bank Controller.
>>>>>>> Initial README

The 64k of addressable memory was divided as follows (in hex):

### 0x0000 - 0x3FFF: Permanently-mapped ROM bank
<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
The first 16kb of a cartridge are always available in this address space. In practice, this section of the ROM contains the game engine and common routines.
=======
The first 16kb of a cartridge are always available in this address space. In practice, this section of the ROM contains the game engine or common routines.
>>>>>>> Initial README

### 0x4000 - 0x7FFF: Switchable ROM bank
This 16kb section of memory could address one of the 16kb 'banks' of switchable cartridge ROM. The current ROM bank it's pointing to is controlled by the cartridge's Memory Bank Controller.

### 0x8000 - 0x9FFF: Video RAM
<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
This 8kb of addressable memory is reserved for the video RAM, which holds sprites and graphics.
=======
This 8kb of addressable memory was reserved for the video RAM, which holds sprites and graphics.
>>>>>>> Initial README

### 0xA000 - 0xBFFF: Cartridge (External) RAM
If there is RAM available on the cartridge, it is addressable in this address space.

### 0xC000 - 0xCFFF and 0xD000 - 0xDFFF: Working RAM
<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
Internal, working RAM used for temporary storage (and other things you use RAM for).
=======
Internal, working RAM used for temporary storage (and other things you use RAM for)
>>>>>>> Initial README

### 0xE000 - 0xFDFF: Reserved
This almost 8k of RAM is reserved and should not be modified. Internally, it's a shadow of the Working RAM, but Nintendo advises not to work with this area of memory.

### 0xFE00 - 0xFE9F: Sprite Information
This section of memory is used to store sprite positions on the screen, as well as their attributes.

### 0xFF00 - 0xFF7F: I/O
The LCD Display, sound, link cable, internal timers, and joypad/buttons were all managed in this section of memory.

### 0xFF80-0xFFFE: Zero Page RAM
This 128 bytes section of memory is used for storage of variables that the programmer needs quick access to.

### 0xFFFF Interrupt Enable Register
A special memory location for the interrupt enable register.

<<<<<<< 51864028744ed341ecf0f7fa04281433d7d3a4cf
### Next Steps



=======
>>>>>>> Initial README
References:
http://imrannazar.com/GameBoy-Emulation-in-JavaScript:-The-CPU
https://github.com/CTurt/Cinoop/blob/990e7d92b759892e98a450b4979e887865d6757f/source/cpu.c
http://imrannazar.com/GameBoy-Z80-Opcode-Map
http://bgb.bircd.org/pandocs.htm
http://www.pastraiser.com/cpu/gameboy/gameboy_opcodes.html
http://www.codeslinger.co.uk/pages/projects/gameboy/beginning.html
http://www.codeslinger.co.uk/pages/projects/gameboy/files/GB.pdf
http://www.phy.davidson.edu/FacHome/dmb/py310/Z80.Instruction%20set.pdf
http://www.idt.mdh.se/utbildning/exjobb/files/TR1234.pdf
