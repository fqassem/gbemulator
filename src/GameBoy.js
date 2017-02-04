import Z80 from './cpu/Z80';
class GameBoy {
    z80 = new Z80();
    clock = { m: 0, t: 0 };

    loadGame() {
    }

    loop() {
        const z80 = this.z80;
        const clock = this.clock;

        clock.m = z80.m;
        clock.t = z80.t;

        z80.step();
        z80.printDebug();
    }
}

const gameBoy = new GameBoy();
gameBoy.loadGame();
