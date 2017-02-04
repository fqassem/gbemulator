import Clock from './Clock';
import MMU from '../memory/MMU';

const ZERO_FLAG = 1 << 7;
const NEGATIVE_FLAG = 1 << 6;
const HALF_CARRY_FLAG = 1 << 5;
const CARRY_FLAG = 1 << 4;

class Z80 {
    registers = {
        a: 0, b: 0, c: 0, d: 0, e: 0, h: 0, l: 0, f: 0, sp: 0, pc: 0
    };
    clock = { m: 0, t: 0 };
    mmu = new MMU();

    step() {
        //Read the current opcode and increment
        const currentInstructionOpcode = this.mmu.readByte(this.registers.pc++);
        this.mapOpcodeToFunction(currentInstructionOpcode);
    }

    clearFlags(flags) {
        this.registers.f &= ~(flags);
    }

    setFlags(flags) {
        this.registers.f |= flags;
    }

    isSet(flag) {
        return (this.registers.f & flag)
    }

    xor(value) {
        const registers = this.registers;

        registers.a ^= value;
        if(registers.a) {
            clearFlags(ZERO_FLAG);
        } else {
            setFlags(ZERO_FLAG);
        }
        clearFlags(CARRY_FLAG | NEGATIVE_FLAG | HALF_CARRY_FLAG);
    }

    inc(register) {
        const registers = this.registers;

        let value = registers[register];
        let flagsToSet = 0;
        let flagsToClear = 0;

        if((value & 0x0F) === 0x0F) {
            flagsToSet |= HALF_CARRY_FLAG;
        } else {
            flagsToClear |= HALF_CARRY_FLAG;
        }

        registers[register]++;

        if(registers[register] !== 0) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear | NEGATIVE_FLAG);
    }

    dec(register) {
        let flagsToSet = NEGATIVE_FLAG;
        let flagsToClear = 0;

    	if(value & 0x0f) {
            flagsToClear |= HALF_CARRY_FLAG;
        }
    	else {
            flagsToSet |= HALF_CARRY_FLAG;
        }

	    registers[register]--;

       if(registers[register] === 0) {
           flagsToSet |= ZERO_FLAG;
       } else {
           flagsToClear |= ZERO_FLAG;
       }

       this.setFlags(flagsToSet);
       this.clearFlags(flagsToClear);
    }

    cp(operand) {
        let a = registers.a;

        let flagsToSet = NEGATIVE_FLAG;
        let clearFlags = 0;

        if(a === operand) {
            flagsToSet |= ZERO_FLAG;
        } else {
            clearFlags |= ZERO_FLAG;
        }

        if(operand > a) {
            flagsToSet |= CARRY_FLAG;
        } else {
            clearFlags |= CARRY_FLAG;
        }

        if((operand & 0x0F) > (a & 0x0F)) {
            flagsToSet |= HALF_CARRY_FLAG;
        } else {
            flagsToClear |= HALF_CARRY_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear);
    }

    mapOpcodeToFunction(opcode) {
        const registers = this.registers;
        const mmu = this.mmu;
        const clock = this.clock;
        if(opcode === 0xCB) {
            this.mapCbOpcodeToFunction(opcode);
        } else {
            switch(opcode) {
                //NOP
                case 0x00: {
                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //DEC B
                case 0x05: {
                    this.dec('b');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD B, d8
                case 0x06: {
                    registers.b = mmu.readByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //INC C
                case 0x0C: {
                    this.inc('c');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //DEC C
                case 0x0D: {
                    this.dec('c');

                    clock.m = 1;
                    clock.t = 4;
                }
                //LD C, d8
                case 0x0E: {
                    registers.c = mmu.readByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //LD DE, d16
                case 0x11: {
                    registers.e = mmu.readByte(registers.pc);
                    registers.d = mmu.readByte(registers.pc + 1);

                    registers.pc += 2;
                    clock.m = 3;
                    clock.t = 12;
                    break;
                }
                // INC DE
                case 0x13: {
                    registers.e = (registers.e + 1) & 255;
                    if(registers.e === 0) {
                        registers.d = (registers.d + 1) & 255;
                    }

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //JR r8
                case 0x18: {
                    const address = mmu.readSignedByte(registers.pc);
                    registers.pc++;

                    registers.pc += address;
                    clock.m = 2;
                    clock.t = 12;

                    break;
                }
                // LD A, (DE)
                case 0x1A: {
                    registers.a = mmu.rb((registers.d << 8) + registers.e);

                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //JR NZ, r8
                case 0x20: {
                    let relativeAddress = mmu.readSignedByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;

                    if(!this.isSet(ZERO_FLAG)) {
                        registers.pc += relativeAddress;
                        clock.m = 3;
                        clock.t += 4;
                    }
                    break;
                }
                //LD HL, d16
                case 0x21: {
                    registers.l = mmu.rb(registers.pc);
                    registers.h = mm.rb(registers.pc + 1);
                    registers.pc += 2;

                    clock.m = 3;
                    clock.t = 16;
                    break;
                }
                //LD (HL+),A
                case 0x22: {
                    mmu.writeByte((registers.h << 8) + registers.l, registers.a);
                    registers.l = (registers.l + 1) & 255;

                    if(registers.l === 0) {
                        registers.h = (registers.h + 1) & 255;
                    }

                    clock.m = 1;
                    clock.t = 8;

                    break;
                }
                //INC HL
                case 0x23: {
                    registers.l = (registers.l + 1) & 255;
                    if(registers.l === 0) {
                        registers.h = (registers.h + 1) & 255;
                    }

                    clock.m = 1;
                    clock.t = 8;

                    break;
                }
                //JR Z, n
                case 0x28: {
                    var address = mmu.mmu.readSignedByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;

                    if(this.isSet(ZERO_FLAG)) {
                         registers.pc += address;
                         clock.m += 1;
                         clock.t += 4;
                     }

                    break;
                }
                //LD L, d8
                case 0x2E: {
                    registers.l = mmu.rb(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //LD SP, d16
                case 0x31: {
                    registers.sp = mmu.readWord(registers.pc);

                    registers.pc += 2;
                    clock.m = 3;
                    clock.t = 12;
                    break;
                }
                //LD (HL-), A
                case 0x32: {
                    mmu.writeByte((registers.h << 8) + registers.l, registers.a);
                    registers.l = (registers.l - 1) & 255;
                    if(registers.l === 255) {
                        registers.h = (registers.h - 1) & 255;
                    }

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //DEC A
                case 0x3D: {
                    this.dec('a');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD A, d8
                case 0x3E: {
                    registers.a = mmu.readByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //LD (HL), A
                case 0x77: {
                    mmu.writeByte((registers.h << 8) + registers.l, registers.a);

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //LD A, E
                case 0x7B: {
                    registers.a = registers.e;

                    clock.m = 1;
                    clock.t = 4;
                }
                //XOR A
                case 0xAF: {
                    this.xor(registers.a);

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                // CALL nn
                case 0xCD: {
                    mmu.writeWord(registers.sp - 2, registers.pc + 2);

                    registers.pc = mmu.readWord(registers.pc);
                    registers.sp -= 2;

                    clock.m = 3;
                    clock.t = 24;
                    break;

                }
                //LDH (a8),A
                case 0xE0: {
                    const address = mmu.readByte(registers.pc);
                    mmu.writeByte(0xFF00 + address, registers.a);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 12;
                    break;
                }
                //LD (0xFF00 + C), A
                case 0xE2: {
                    mmu.writeByte(0xFF00 + registers.c, registers.a);

                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //LD (a16), A
                case 0xEA: {
                    const wordAtAddress = mmu.readWord(registers.pc)
                    mmu.writeByte(wordAtAddress, registers.a);

                    registers.pc += 2;
                    clock.m = 4;
                    clock.t = 16;
                    break;
                }
                //CP n
                case 0xFE: {
                    this.cp(mmu.readByte(registers.pc));

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
            }
        }
    }

    bit(bitNumber, value) {
        if(value & (1 << bitNumber)) {
            clearFlags(ZERO_FLAG);
        } else {
            setFlags(ZERO_FLAG);
        }

        clearFlags(NEGATIVE_FLAG);
        setFlags(HALF_CARRY_FLAG);
    }

    mapCbOpcodeToFunction(opcode) {
        const clock = this.clock;
        const mmu = this.mmu;

        switch(opcode) {
            //BIT 7,H
            case 0x7C: {
                this.bit(7, registers.h);
                clock.m = 2;
                clock.t = 8;
            }
        }
    }
}
export default Z80;
