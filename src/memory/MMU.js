import defaultBios from './bios';

class MMU {
    vram = [];
    bios = defaultBios;

    readByte(address) {
        let valueAtAddress;
        if(address <= 0x7FFF) {
            return bios[address];
        } else if(address >= 0x8000 && address <= 0x9FFF) {
            return vram[address - 0x8000];
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
            throw new Error('Not yet implemented');//zero page ram
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
            vram[address - 0x8000] = value;
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
            throw new Error('Not yet implemented');//zero page ram
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
