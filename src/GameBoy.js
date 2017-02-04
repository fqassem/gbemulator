import Z80 from './cpu/Z80';
class GameBoy {
    z80 = new Z80();
    clock = { m: 0, t: 0 };

    loadGame() {
    }

    loop() {
        this.clock.m = this.z80.m;
        this.clock.t = this.z80.t;

        this.z80.step();
    }
}

const gameBoy = new GameBoy();
gameBoy.loadGame();
gameBoy.loop();
gameBoy.loop();
gameBoy.loop();
