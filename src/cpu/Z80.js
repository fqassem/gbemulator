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

    constructor() {
        this.printDebug();
    }

    printDebug() {
        /* eslint-disable no-console */
        console.log(`Registers: ${JSON.stringify(this.registers)}`);
        console.log(`Clock: ${JSON.stringify(this.clock)}`);
        /* eslint-enable no-console */
    }

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
        return (this.registers.f & flag);
    }

    xor(value) {
        const registers = this.registers;
        let flagsToSet = 0;
        let flagsToClear = CARRY_FLAG | NEGATIVE_FLAG | HALF_CARRY_FLAG;

        registers.a ^= value;
        if(registers.a) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear);
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
        const registers = this.registers;
        let flagsToSet = NEGATIVE_FLAG;
        let flagsToClear = 0;

        if(registers[register] & 0x0f) {
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

    add(value) {
        const registers = this.registers;
        const result = registers.a + value;

        let flagsToSet = 0;
        let flagsToClear = NEGATIVE_FLAG;

        if(result & 0xFF00) {
            flagsToSet |= CARRY_FLAG;
        } else {
            flagsToClear |= CARRY_FLAG;
        }

        registers.a = result & 0xFF;

        if(registers.a) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        if(((registers.a & 0x0F) + (value & 0x0F)) > 0xFF) {
            flagsToSet |= HALF_CARRY_FLAG;
        }
        else {
            flagsToClear |= HALF_CARRY_FLAG;
        }

        this.setFlags(flagsToSet);
        this.setFlags(flagsToClear);
    }

    cp(operand) {
        const registers = this.registers;
        let a = registers.a;

        let flagsToSet = NEGATIVE_FLAG;
        let flagsToClear = 0;

        if(a === operand) {
            flagsToSet |= ZERO_FLAG;
        } else {
            flagsToClear |= ZERO_FLAG;
        }

        if(operand > a) {
            flagsToSet |= CARRY_FLAG;
        } else {
            flagsToClear |= CARRY_FLAG;
        }

        if((operand & 0x0F) > (a & 0x0F)) {
            flagsToSet |= HALF_CARRY_FLAG;
        } else {
            flagsToClear |= HALF_CARRY_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear);
    }

    sub(register) {
        const registers = this.registers;
        const value = registers[register];

        let flagsToSet = NEGATIVE_FLAG;
        let flagsToClear = 0;

        if(value > registers.a) {
            flagsToSet |= CARRY_FLAG;
        }
        else {
            flagsToClear |= CARRY_FLAG;
        }

        if((value & 0x0f) > (registers.a & 0x0f)) {
            flagsToSet |= HALF_CARRY_FLAG;
        } else {
            flagsToClear |= HALF_CARRY_FLAG;
        }

        registers.a -= value;

        if(registers.a) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.setFLags(flagsToSet);
        this.clearFlags(flagsToClear);
    }

    rla(register) {
        const registers = this.registers;
        let carry = this.isSet(CARRY_FLAG) ? 1 : 0;
        const value = registers[register];

        let flagsToSet = 0;
        let flagsToClear = NEGATIVE_FLAG | HALF_CARRY_FLAG;

        if(value & 0x80) {
            flagsToSet |= CARRY_FLAG;
        } else {
            flagsToClear |= CARRY_FLAG;
        }

        registers[register] <<= 1;
        registers[register] += carry;

        if(registers[register]) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear);
    }

    mapOpcodeToFunction(opcode) {
        const registers = this.registers;
        const mmu = this.mmu;
        const clock = this.clock;


        console.log(`Current Opcode: ${opcode.toString(16)}`); //eslint-disable-line no-console
        if(opcode === 0xCB) {
            registers.pc++;
            this.mapCbOpcodeToFunction(opcode);
        } else {
            switch(opcode) {
                //NOP
                case 0x00: {
                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //INC B
                case 0x04: {
                    this.inc('b');

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
                    break;
                }
                //DEC D
                case 0x15: {
                    this.dec('d');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD D, d8
                case 0x16: {
                    registers.d = mmu.readByte(registers.pc);

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //RLA
                case 0x17: {
                    this.rl('a');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //DEC E
                case 0x1D: {
                    this.dec('e');

                    clock.m = 1;
                    clock.t = 4;
                    break;
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
                    registers.a = mmu.readByte((registers.d << 8) + registers.e);

                    clock.m = 2;
                    clock.t = 8;
                    break;
                }
                //LD E,d8
                case 0x1E: {
                    registers.e = mmu.readByte(registers.pc);

                    registers.pc++;
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
                    registers.l = mmu.readByte(registers.pc);
                    registers.h = mmu.readByte(registers.pc + 1);
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
                //INC H
                case 0x24: {
                    this.inc('h');

                    clock.m = 1;
                    clock.t = 4;
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
                    registers.l = mmu.readByte(registers.pc);

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
                //LD C, A
                case 0x4F: {
                    registers.c = registers.a;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD D, A
                case 0x57: {
                    registers.h = registers.a;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD H, A
                case 0x67: {
                    registers.h = registers.a;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD (HL), A
                case 0x77: {
                    mmu.writeByte((registers.h << 8) + registers.l, registers.a);

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //LD A, B
                case 0x78: {
                    registers.a = registers.b;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD A, E
                case 0x7B: {
                    registers.a = registers.e;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD A, H
                case 0x7C: {
                    registers.a = registers.h;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD A, L
                case 0x7D:{
                    registers.a = registers.l;

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //ADD A, (HL)
                case 0x86: {
                    this.add(mmu.readByte((registers.h << 8) + registers.l));

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //SUB B
                case 0x90: {
                    this.sub('b');

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //XOR A
                case 0xAF: {
                    this.xor(registers.a);

                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //CP (HL)
                case 0xBE: {
                    this.cp(mmu.readByte((registers.h << 8)+ registers.l));

                    clock.m = 1;
                    clock.t = 8;
                    break;
                }
                //POP BC
                case 0xC1: {
                    registers.c = mmu.readByte(registers.sp);
                    registers.sp++;
                    registers.b = mmu.readByte(registers.sp);
                    registers.sp++;

                    clock.m = 1;
                    clock.t = 12;
                    break;
                }
                //PUSH BC
                case 0xC5: {
                    registers.sp--;
                    mmu.writeByte(registers.sp, registers.b);

                    Z80._r.sp--;
                    mmu.writeByte(registers.sp, registers.c);

                    clock.m = 1;
                    clock.t = 16;

                    break;
                }
                //RET
                case 0xC9: {
                    registers.pc = mmu.readWord(registers.sp);
                    registers.sp += 2;

                    clock.m = 1;
                    clock.t = 16;
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
                    const wordAtAddress = mmu.readWord(registers.pc);
                    mmu.writeByte(wordAtAddress, registers.a);

                    registers.pc += 2;
                    clock.m = 4;
                    clock.t = 16;
                    break;
                }
                //LDH A,(a8)
                case 0xF0: {
                    const byteAtAddress = mmu.readByte(0xFF00 + mmu.readByte(registers.pc));
                    registers.a = byteAtAddress;

                    registers.pc++;
                    clock.m = 2;
                    clock.t = 12;
                    break;
                }
                //LD A, ($FF00+C)
                case 0xF2: {
                    registers.a = mmu.readByte(0xFF00 + registers.c);

                    clock.m = 2;
                    clock.t = 8;
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
        let flagsToSet = 0;
        let flagsToClear = NEGATIVE_FLAG;

        if(value & (1 << bitNumber)) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.clearFlags(flagsToClear);
        this.setFlags(flagsToSet);
    }

    rl(register) {
        const registers = this.registers;
        const value = registers[register];
        let originalCarry = this.isFlagSet(CARRY_FLAG) ? 1 : 0;

        let flagsToSet = 0;
        let flagsToClear = NEGATIVE_FLAG | HALF_CARRY_FLAG;

        if(value & 0x80) {
            flagsToSet |= CARRY_FLAG;
        } else {
            flagsToClear |= CARRY_FLAG;
        }

        registers[register] <<= 1;
        registers[register] += originalCarry;

        if(registers[register]) {
            flagsToClear |= ZERO_FLAG;
        } else {
            flagsToSet |= ZERO_FLAG;
        }

        this.setFlags(flagsToSet);
        this.clearFlags(flagsToClear);
    }

    mapCbOpcodeToFunction(opcode) {
        const clock = this.clock;
        const registers = this.registers;

        switch(opcode) {
            //RL C
            case 0x11: {
                this.rl('c');

                clock.m = 2;
                clock.t = 8;
                break;
            }
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
