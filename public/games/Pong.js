let assetsLoader = {
    "background": "background",
    "projectile": "projectile_2",
    "platform_1": "platform",
    "platform_2": "platform"
};

let soundsLoader = {
    "background": "background",
    'shoot': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/jump_1.mp3',
    'damage': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/flap_1.wav',
    "success": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/success_1.wav",
    'lose': 'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3',
}

// Custom UI Elements
const title = `Pong`
const description = `A table tennis themed arcade game to defeat the opposing enemy`
const instructions =
    `Instructions:
  1. Move the mouse/touch pointer to control player`;

const orientationSizes = {
    "landscape": {
        "width": 1280,
        "height": 720,
    },
    "portrait": {
        "width": 720,
        "height": 1280,
    }
}

// Game Orientation
const orientation = "landscape";

/*
------------------- GLOBAL CODE STARTS HERE -------------------
*/

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');

        this.leftPaddle;
        this.rightPaddle;
        this.ball;
        this.leftScore = 0;
        this.rightScore = 0;
        this.leftScoreText;
        this.rightScoreText;
        this.scoreForWin = 10;
        this.stopFollowafterBounces = Phaser.Math.Between(8, 15);
    }

    preload() {
        this.score = 0;
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        this.load.bitmapFont('pixelfont',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.png',
            'https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/pix.xml');
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        addEventListenersPhaser.bind(this)();
        displayProgressLoader.call(this);
    }

    create() {
        this.width = this.game.config.width;
        this.height = this.game.config.height;
        this.vfx = new VFXLibrary(this);
        this.collideCountOnRIghtPaddle = 0;

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(3).setLoop(true).play();

        this.bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, "background").setOrigin(0.5);
        const scale = Math.max(this.game.config.width / this.bg.displayWidth, this.game.config.height / this.bg.displayHeight);
        this.bg.setScale(scale);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
        this.pauseButton = this.add.image(this.game.config.width - 60, 60, "pauseButton");
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(2).setScrollFactor(0).setDepth(11);
        this.pauseButton.on('pointerdown', () => this.pauseGame());


        // Create ball
        this.ball = this.physics.add.sprite(this.width / 2, this.height / 2, 'projectile').setOrigin(0.5);
        this.ball.setCollideWorldBounds(true).setBounce(1).setScale(0.05);

        // Create paddles
        this.leftPaddle = this.physics.add.sprite(30, this.height / 2, 'platform_1').setCollideWorldBounds(true);
        this.leftPaddle.displayHeight = this.height * 0.2;
        this.leftPaddle.displayWidth = 20;
        this.leftPaddle.body.setOffset(-10, -10);
        this.leftPaddle.body.immovable = true;
        this.leftPaddle.name = "PLAYER";
        this.leftPaddle.refreshBody();

        this.rightPaddle = this.physics.add.sprite(this.width - 30, 0, 'platform_2').setCollideWorldBounds(true);
        this.rightPaddle.displayHeight = this.height * 0.2;
        this.rightPaddle.displayWidth = 20;
        this.rightPaddle.body.setOffset(-10, -10);
        this.rightPaddle.body.immovable = true;
        this.rightPaddle.name = "PC";
        this.rightPaddle.refreshBody();

        this.input.on('pointermove', function (pointer) {
            this.leftPaddle.y = pointer.y;
        }, this);


        this.input.once('pointerdown', () => {
            this.startPlay();
        }, this);

        this.physics.add.collider(this.ball, this.leftPaddle, this.ballHitsPaddle.bind(this));
        this.physics.add.collider(this.ball, this.rightPaddle, this.ballHitsPaddle.bind(this));

        this.endText = this.add.bitmapText(this.width / 2, this.height/2, 'pixelfont', `YOU WON!`, 70).setOrigin(0.5).setTint(0x00ff00).setVisible(false);
        this.instructionText = this.add.bitmapText(this.width / 2, this.height - 200, 'pixelfont', `Tap to start`, 50).setOrigin(0.5);
        // Score text
        this.leftScoreText = this.add.bitmapText(90, 30, 'pixelfont', `PLAYER : ${this.leftScore}`, 28);
        this.rightScoreText = this.add.bitmapText(this.width - 150, 30, 'pixelfont', `PC : ${this.rightScore}`, 28);
        this.rightScoreText.setOrigin(1, 0);
    }

    ballHitsPaddle(ball, paddle) {
        this.sounds.shoot.play();
        if (paddle.name === "PC" && this.followBall) {
            this.collideCountOnRIghtPaddle++;
            if (this.collideCountOnRIghtPaddle > this.stopFollowafterBounces) {
                this.collideCountOnRIghtPaddle = 0;
                this.followBall = false;
                this.startUpperTween();
            }
        }
        let diff = 0;
        if (ball.y < paddle.y) {
            diff = paddle.y - ball.y;
            ball.setVelocityY(-10 * diff);
        } else if (ball.y > paddle.y) {
            diff = ball.y - paddle.y;
            ball.setVelocityY(10 * diff);
        } else {
            ball.setVelocityY(2 + Math.random() * 8);
        }
    }

    update() {
        if (this.followBall) {
            this.rightPaddle.y = this.ball.y
        }

        if (this.ball.x < 30 || this.ball.x > this.width - 30) {
            this.followBall = true;
            if (this.ball.x < 30) {
                this.rightScore++;
                this.sounds.damage.play();
                this.scorePointAnim(this.rightPaddle);

                if (this.rightScore >= this.scoreForWin) {
                    this.ball.x = this.width/2;
                    this.ball.destroy();
                    this.time.delayedCall(1200, () => {
                        this.time.delayedCall(1200, () => {
                            this.gameOver();
                        })
                        this.endText.setVisible(true).setText("YOU LOST!").setTint(0xFF0000);
                    });
                } else {
                    this.resetPositions();
                }

            } else {
                this.leftScore++;
                this.sounds.success.play();
                this.scorePointAnim(this.leftPaddle);

                if (this.leftScore >= this.scoreForWin) {
                    this.ball.x = this.width/2;
                    this.ball.destroy();
                    this.time.delayedCall(1200, () => {
                        this.time.delayedCall(1200, () => {
                            this.gameOver();
                        })
                        this.endText.setVisible(true).setText("YOU WON!").setTint(0x00FF00);
                    });
                } else {
                    this.resetPositions();
                }
            }
            this.leftScoreText.setText(`Player : ${this.leftScore}`);
            this.rightScoreText.setText(`PC : ${this.rightScore}`);
        }

    }

    resetPositions() {
        this.instructionText.setVisible(true);
        this.ball.setPosition(this.width / 2, this.height / 2);
        this.ball.setVelocity(0);
        this.rightPaddle.setPosition(this.width - 30, 0);

        this.input.once('pointerdown', () => {
            this.stopFollowafterBounces = Phaser.Math.Between(8, 15);
            this.startPlay();
        }, this);
    }

    scorePointAnim(object) {
        let scoreText = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', object.name + ' +1', 50).setTint(0xff9900).setOrigin(0.5);

        this.tweens.add({
            targets: scoreText,
            y: this.height / 2 - 100,
            duration: 1000,
            ease: 'Power1',
            onComplete: function () {
                scoreText.destroy();
            }
        });
    }

    startPlay() {
        this.instructionText.setVisible(false);
        this.followBall = true;
        let randomX = Math.random() < 0.5 ? -1000 : 1000;
        let randomY = Math.random() < 0.5 ? -300 : 300;
        this.ball.setVelocity(randomX, randomY);
    }

    startUpperTween() {
        let upperTween = this.tweens.add({
            targets: this.rightPaddle,
            y: 0,
            duration: 800,
            onComplete: () => {
                upperTween.destroy();
                if (!this.followBall) this.startLowerTween();
            }
        });
    }

    startLowerTween() {

        let lowerTween = this.tweens.add({
            targets: this.rightPaddle,
            y: this.height,
            duration: 800,
            onComplete: () => {
                lowerTween.destroy();
                if (!this.followBall) this.startUpperTween();
            }
        });
    }

    gameOver() {
        initiateGameOver.bind(this)({ score: this.score });
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }
}
function displayProgressLoader() {
    let width = 320;
    let height = 50;
    let x = (this.game.config.width / 2) - 160;
    let y = (this.game.config.height / 2) - 50;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(x, y, width, height);

    const loadingText = this.make.text({
        x: this.game.config.width / 2,
        y: this.game.config.height / 2 + 20,
        text: 'Loading...',
        style: {
            font: '20px monospace',
            fill: '#ffffff'
        }
    }).setOrigin(0.5, 0.5);
    loadingText.setOrigin(0.5, 0.5);

    const progressBar = this.add.graphics();
    this.load.on('progress', (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x364afe, 1);
        progressBar.fillRect(x, y, width * value, height);
    });
    this.load.on('fileprogress', function (file) {
         
    });
    this.load.on('complete', function () {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
    });
}

/*
------------------- GLOBAL CODE ENDS HERE -------------------
*/

// Configuration object
const config = {
    type: Phaser.AUTO,
    width: orientationSizes[orientation].width,
    height: orientationSizes[orientation].height,
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
            debug: false,
        },
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: true,
};