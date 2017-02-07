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

        try {
            while(1) { //eslint-disable-line
                z80.step();
                this.z80.printDebug();
            }
        } catch(ex) {
            throw ex;
        }
    }
}

const gameBoy = new GameBoy();
window.gameBoy = gameBoy;
