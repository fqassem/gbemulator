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
        let setFlags = 0;
        let clearFlags = 0;

        if((value & 0x0F) === 0x0F) {
            setFlags |= HALF_CARRY_FLAG;
        } else {
            clearFlags |= HALF_CARRY_FLAG;
        }

        registers[register]++;

        if(registers[register] !== 0) {
            clearFlags |= ZERO_FLAG;
        } else {
            setFlags |= ZERO_FLAG;
        }

        setFlags(setFlags);
        clearFlags(clearFlags | NEGATIVE_FLAG);

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
                //INC C
                case 0x0C: {
                    this.inc('c');
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
                //JR NZ, r8
                case 0x20: {
                    let relativeAddress = mmu.readSignedByte(registers.pc);

                    registers.pc++;
                    registers.m = 2;
                    registers.t = 8;

                    if((registers.f & ZERO_FLAG) === 0) {
                        registers.pc += relativeAddress;
                        registers.m = 3;
                        registers.t += 4;
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
                //XOR A
                case 0xAF: {
                    this.xor(registers.a);
                    clock.m = 1;
                    clock.t = 4;
                    break;
                }
                //LD (0xFF00 + C), A
                case 0xE2: {
                    mmu.writeByte(0xFF00 + registers.c, registers.a);

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
