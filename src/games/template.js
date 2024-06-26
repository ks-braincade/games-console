import Phaser from "phaser";
import * as braincadeSDK from "../braincadeSDK";
import VFXLibrary from "../vfxLibrary";
import { populateAssetsLoader } from "./assets_list";
import { populateSoundsLoader } from "./sounds_list";

let assetsLoader = {}

let soundsLoader = {
    "background": "background"
}

assetsLoader = populateAssetsLoader(assetsLoader);
soundsLoader = populateSoundsLoader(soundsLoader);

const title = ``
const description = ``
const instructions = ``;

class GameScene {
    preload() {
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        braincadeSDK.addEventListenersPhaser.bind(this)();
    }

    create() {
        this.vfx = new VFXLibrary(this);

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.input.keyboard.disableGlobalCapture();
    }

    pauseGame() {
        braincadeSDK.handlePauseGame.bind(this)();
    }

    gameOver() {
        braincadeSDK.initiateGameOver.bind(this)({ score: this.score });
    }
}

const config = {
    type: Phaser.AUTO,
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true, // true for landscape, false for portrait
    parent: "game-container",
};

export default config;

// this.sound.add('jump', { loop: false, volume: 1 }).play();  --OLD
// this.sounds.jump.setVolume(1).setLoop(false).play()  --NEW