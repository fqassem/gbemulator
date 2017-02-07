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
