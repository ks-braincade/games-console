
let assetsLoader = {
    "background": "background",
    "enemy": "enemy",
    "player": "player",
    "projectile": "projectile"
}

let soundsLoader = {
    "background": "background",
    "shoot": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3",
    "success": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/success_1.wav",
    "destroy": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/slice.flac",
    "lose": "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_1.mp3",

}

const title = `Ninja Blades`
const description = ` Throw Blades.`
const instructions =
    `Instructions:
    Tap to throw`;

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.score = 0;
        this.cursors = null;
        this.playerSpeed = 300;
        this.jumpSpeed = 600;
        this.isJumping = false;
        this.playerState = 'idle';
        this.gameScene = 1;
        this.loadNextScene = false;
        this.gameStarted = false;
        this.gameOverC = false;
        this.levelOver = false;
        this.gameScore = 0;
        this.levelOverText = null;
        this.nextLevelButton = null;
        this.enemyKilledScore = 0;
        this.gameOverText = null;
        this.loseSoundPlayed = false;


        this.playerBulletBounces = 8;
        this.playerBullets = 5;
        this.playerBulletsRemaining = 5;

        this.playerBullets = [];
        this.bulletsRemainingImages = [];
        this.enemies = [];
        this.bridges = [];
    }

    preload() {
        for (const key in assetsLoader) {
            this.load.image(key, assetsLoader[key]);
        }

        for (const key in soundsLoader) {
            this.load.audio(key, [soundsLoader[key]]);
        }

        addEventListenersPhaser.bind(this)();

        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");
        this.load.image('cave_ground', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Bricks/s2+Brick+01+Grey.png`);
        this.load.image('bridge_mid', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Wall/s2+greenish+tile+horizontal.png`);
        this.load.image('bridge_mid_v', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/textures/Wall/s2+greenish+tile+vertical.png`);
        this.load.image('next_level', `https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/arrow.png`)

        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');
    }

    shootPlayerBullet(pointer, bulletBounces, offset = 0, myGravity = false) {
        this.sounds.shoot.setVolume(1).setLoop(false).play();

        if (this.gameOverC) {
            return;
        }
        if (this.playerBulletsRemaining > 0) {
            this.playerBulletsRemaining -= 1;
            this.displayBulletsRemaining();
        }
        else
            return;
        var ninjaStar = this.physics.add.sprite(this.player.x, this.player.y, 'projectile');
        ninjaStar.setScale(0.03);
        ninjaStar.setDepth(1);
        this.physics.moveTo(ninjaStar, pointer.x + offset, pointer.y + offset, 600);
        ninjaStar.setCollideWorldBounds(true);
        ninjaStar.setBounce(1);
        ninjaStar.body.allowGravity = myGravity;
        ninjaStar.setData('bounces', bulletBounces);
        ninjaStar.setData('currentBounces', 0);
        this.playerBullets.push(ninjaStar);

        this.tweens.add({
            targets: ninjaStar,
            angle: 360,
            duration: 1000,
            repeat: -1, // Repeat forever
            ease: 'Linear'
        });
        // let bubble = this.add.graphics({ x: -100, y: 0, add: false });

        // const bubbleRadius = 10;
        // const bubbleColor = 0xffffff; // A nice bubble color

        // bubble.fillStyle(bubbleColor, .3); // Semi-transparent
        // bubble.fillCircle(bubbleRadius, bubbleRadius, bubbleRadius);
        // bubble.generateTexture('bubbles', 100, 100);

        // this.trail = this.add.particles(0, 70, 'bubbles', {
        //     speed: 100,
        //     scale: { start: 0.5, end: 0 },
        //     blendMode: 'ADD',
        //     lifespan: 600,
        //     angle: { min: -40, max: -10 },
        //     emitZone: { type: 'edge', source: new Phaser.Geom.Line(-10, -10, 10, 10), quantity: .2, yoyo: false }
        // });
        // this.trail.startFollow(this.player);


    }

    handlePlayerBulletBounce() {
        this.physics.world.bodies.entries.forEach(function (body) {

            if (body.gameObject.texture.key === 'projectile' && body.blocked.none === false) {
                body.gameObject.setData('currentBounces', body.gameObject.getData('currentBounces') + 1);
                body.gameObject.setFlipX(!body.gameObject.flipX);
                if (body.gameObject.getData('currentBounces') >= body.gameObject.getData('bounces')) {
                    body.gameObject.destroy();
                }
                else {
                    // this.sound.play('ninja_star_bounce_sound');
                }
            }
        }, this);
    }

    destroyPlayerBullet(bullet) {

        bullet.destroy();
    }


    spawnEnemy(x, y, enemyObj, speed, distX, distY) {
        let enemy = this.physics.add.sprite(x, y, enemyObj);
        enemy.name = enemyObj;
        this.enemies.push(enemy);
        enemy.setScale(0.15);
        this.vfx.scaleGameObject(enemy, 1.1);
        let distance = Math.sqrt(distX * distX + distY * distY);
        let fps = 60;
        let time = (distance / speed) * fps * 10; // speed units must be pixels/second

        if (distX + distY > 0) {
            this.tweens.add({
                targets: enemy,
                x: x + distX,
                //y: y + distY,
                duration: time,
                yoyo: true,
                repeat: -1,
                onYoyo: function (tween, target, targetKey, value, tweenData, index) {
                    target.setFlipX(true);
                },
                onRepeat: function (tween, target, targetKey, value, tweenData, index) {
                    target.setFlipX(false);
                }
            });
        }
    }

    destroyEnemy(enemy) {
        this.playerDestroyEmitter.explode(400, enemy.x, enemy.y);
        this.enemies = this.enemies.filter(e => e !== enemy);
        // let x = enemy.x;
        // let y = enemy.y;
        enemy.destroy();
        // let defeatedEnemy = this.add.sprite(x, y, 'tengu_defeat');
        // defeatedEnemy.setScale(0.5);
        // defeatedEnemy.play('tengu_defeat');
        // // this.sound.play('enemy_death_sound');
        // this.time.delayedCall(800, () => {
        //     defeatedEnemy.destroy();
        // }, [], this);
    }
    bulletHitsEnemy(bullet, enemy) {
        this.sounds.destroy.setVolume(1).setLoop(false).play();

        this.destroyPlayerBullet(bullet);
        this.gameScoreHandler(100);
        this.enemyKilledScore += 100;
        this.destroyEnemy(enemy);
        this.gameSceneHandler();
    }

    create_Bridge(x, y, length, rotate = false) {
        let bridge_mid_width = 128; // Manually setting width of bridge_mid
        if (rotate) {
            for (let i = 0; i < length; i++) {
                this.bridges.create(x, y + i * bridge_mid_width, 'bridge_mid_v');
            }
        }
        else {
            for (let i = 0; i < length - 1; i++) {
                this.bridges.create(x + i * bridge_mid_width, y, 'bridge_mid');
            }
        }
    }

    add_colliders() {
        this.physics.add.collider(this.player, this.ground);
        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.collider(this.enemies, this.bridges);
        this.physics.add.collider(this.playerBullets, this.enemies, this.bulletHitsEnemy, null, this);
        this.physics.add.collider(this.playerBullets, this.bridges);
        this.physics.add.collider(this.playerBullets, this.ground);
    }

    create() {
        this.vfx = new VFXLibrary(this);

        this.cursor = this.input.keyboard.createCursorKeys();

        this.sounds = {};
        for (const key in soundsLoader) {
            this.sounds[key] = this.sound.add(key, { loop: false, volume: 0.5 });
        }

        this.sounds.background.setVolume(1).setLoop(true).play();
        var me = this;

        this.bg = this.add.sprite(0, 0, 'background').setOrigin(0, 0).setDepth(-5);
        this.bg.displayWidth = this.game.config.width;
        this.bg.displayHeight = this.game.config.height;


        this.width = this.game.config.width;
        this.height = this.game.config.height;

        // Add UI elements
        this.scoreText = this.add.bitmapText(this.width / 2, 50, 'pixelfont', '0', 64).setOrigin(0.5, 0.5);
        this.scoreText.setDepth(100)
        // here u can remove the keyword to have less tile sheet
        this.pauseButton = this.add.sprite(this.width - 50, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setDepth(11)
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.playerDestroyEmitter = this.vfx.createEmitter('enemy', 0, 0, 0.035, 0, 1000).setAlpha(0.5)
        this.bridges = this.physics.add.staticGroup();
        this.ground = this.physics.add.staticImage(320, 1240, 'cave_ground').setScale(3.15, 1);
        this.ground.body.setSize(this.ground.width * 5, this.ground.height);

        this.player = this.physics.add.sprite(150, 800, 'player');
        this.player.setScale(0.2);
        // this.player.play('idle');

        this.add_colliders();

        this.clearScreen();
        this.create_scenes(this.gameScene);

        this.displayBulletsRemaining();
        this.gameScoreHandler(0)

        this.input.on('pointerdown', function (pointer) {
            if (!this.gameStarted)
                this.gameStarted = true;
            this.shootPlayerBullet(pointer, this.playerBulletBounces, 0, false);
        }, this);

    }

    update(delta) {
        this.handlePlayerBulletBounce();
        this.checkGameOver();

    }

    checkGameOver() {
        let bulletsAlive = this.playerBullets.some(bullet => bullet.active);
        if (this.gameStarted && !bulletsAlive && this.playerBulletsRemaining === 0 && this.enemies.length > 0) {

            if (!this.loseSoundPlayed) {
                this.sounds.lose.setVolume(1).setLoop(false).play();
                this.loseSoundPlayed = true;
                this.resetGame();
            }
        }
    }

    create_scenes(scene) {
        this.loadNextScene = false;
        this.enemyKilledScore = 0;
        this.gameStarted = false;


        this.physics.add.collider(this.enemies, this.bridges);
        this.physics.add.collider(this.playerBullets, this.enemies, this.bulletHitsEnemy, null, this);
        switch (scene) {
            case 1:
                this.playerBulletsRemaining = 6;
                this.displayBulletsRemaining();
                this.create_Bridge(10, 550, 4);
                this.spawnEnemy(65, 250, 'enemy', 100, 0, 0)
                break;

            case 2:
                this.playerBulletsRemaining = 6;
                this.displayBulletsRemaining();
                this.create_Bridge(65, 500, 4);
                this.spawnEnemy(100, 250, 'enemy', 100, 250, 0)
                this.create_Bridge(290, 250, 4);
                this.spawnEnemy(250, 100, 'enemy', 75, 300, 0)
                break;

            case 3: // New level
                this.playerBulletsRemaining = 6;
                this.displayBulletsRemaining();
                this.create_Bridge(265, 450, 3);
                this.create_Bridge(65, 250, 5);
                this.spawnEnemy(70, 100, 'enemy', 50, 370, 0);
                this.spawnEnemy(270, 300, 'enemy', 50, 180, 0);
                break;

            case 4:
                this.playerBulletsRemaining = 7;
                this.displayBulletsRemaining();
                this.create_Bridge(575, 505, 1, true);
                this.create_Bridge(180, 505, 1, true);
                this.create_Bridge(250, 546, 4);
                this.spawnEnemy(220, 240, 'enemy', 50, 260, 0)
                break;

            case 5: // New level
                this.playerBulletsRemaining = 7;
                this.displayBulletsRemaining();
                this.create_Bridge(100, 296, 3);

                this.create_Bridge(390, 555, 1, true);
                this.create_Bridge(655, 555, 1, true);
                this.create_Bridge(460, 596, 3);

                this.spawnEnemy(90, 120, 'enemy', 50, 120, 0)
                this.spawnEnemy(430, 220, 'enemy', 50, 140, 0)
                break;

            default:
                const randomCase = Math.floor(Math.random() * 5) + 1;
                switch (randomCase) {
                    case 1:
                        this.playerBulletsRemaining = 6;
                        this.displayBulletsRemaining();
                        this.create_Bridge(10, 550, 4);
                        this.spawnEnemy(65, 250, 'enemy', 100, 0, 0)
                        break;

                    case 2:
                        this.playerBulletsRemaining = 6;
                        this.displayBulletsRemaining();
                        this.create_Bridge(65, 500, 4);
                        this.spawnEnemy(100, 250, 'enemy', 100, 250, 0)
                        this.create_Bridge(290, 250, 4);
                        this.spawnEnemy(250, 100, 'enemy', 75, 300, 0)
                        break;

                    case 3: // New level
                        this.playerBulletsRemaining = 6;
                        this.displayBulletsRemaining();
                        this.create_Bridge(265, 450, 3);
                        this.create_Bridge(65, 250, 5);
                        this.spawnEnemy(70, 100, 'enemy', 50, 370, 0);
                        this.spawnEnemy(270, 300, 'enemy', 50, 180, 0);
                        break;

                    case 4:
                        this.playerBulletsRemaining = 7;
                        this.displayBulletsRemaining();
                        this.create_Bridge(575, 505, 1, true);
                        this.create_Bridge(180, 505, 1, true);
                        this.create_Bridge(250, 546, 4);
                        this.spawnEnemy(220, 240, 'enemy', 50, 260, 0)
                        break;

                    case 5: // New level
                        this.playerBulletsRemaining = 7;
                        this.displayBulletsRemaining();
                        this.create_Bridge(100, 296, 3);

                        this.create_Bridge(390, 555, 1, true);
                        this.create_Bridge(655, 555, 1, true);
                        this.create_Bridge(460, 596, 3);

                        this.spawnEnemy(90, 120, 'enemy', 50, 120, 0)
                        this.spawnEnemy(430, 220, 'enemy', 50, 140, 0)
                        break;
                }
                break;

        }
    }

    gameSceneHandler() {
        if (this.gameStarted) {
            if (this.enemies.length <= 0 && !this.levelOver) {
                this.levelOver = true;
                this.gameScoreHandler(this.playerBulletsRemaining * 100);
                this.showLevelOver();
            }
        }

    }

    gameScoreHandler(score) {
        this.gameScore += score;
    }

    clearScreen() {
        this.enemies.forEach(enemy => this.destroyEnemy(enemy));
        this.playerBullets.forEach(bullet => this.destroyPlayerBullet(bullet));
        this.bridges.clear(true, true); // Add this line to clear bridges

    }

    showLevelOver() {
        this.sounds.success.setVolume(1).setLoop(false).play();

        // this.sound.play('next_level_sound');
        var enemyKilledGraphic = this.add.image(200, 380, 'enemy').setScale(0.07).setVisible(false);
        var ninjaStarGraphic = this.add.image(200, 438, 'projectile').setScale(0.07).setVisible(false);
        if (!this.levelOverText) {
            this.levelOverText = this.add.bitmapText(this.width / 2, 550, 'pixelfont', '0', 64)
                .setOrigin(0.5, 0.5).setDepth(100);

        }

        var levelScore = this.enemyKilledScore + (this.playerBulletsRemaining * 100);
        this.levelOverText.setText('Level Score: ' + levelScore + '\nFinal Score: ' + this.gameScore);
        this.levelOverText.setVisible(true);
        this.updateScore(levelScore);

        // Display enemy killed score
        if (!this.enemyKilledText) {
            this.enemyKilledText = this.add.bitmapText(this.width / 2, 370, 'pixelfont', '0', 64)
                .setOrigin(0.5, 0.5).setDepth(100);

        }
        this.enemyKilledText.setText('' + this.enemyKilledScore);
        this.enemyKilledText.setVisible(true);
        enemyKilledGraphic.setVisible(true);

        // Display ninja star score
        if (!this.ninjaStarText) {
            this.ninjaStarText = this.add.bitmapText(this.width / 2, 430, 'pixelfont', '0', 64)
                .setOrigin(0.5, 0.5).setDepth(100);
        }
        this.ninjaStarText.setText('' + this.playerBulletsRemaining * 100);
        this.ninjaStarText.setVisible(true);
        ninjaStarGraphic.setVisible(true);

        // Create a 'Next Level' button if it doesn't exist
        if (!this.nextLevelButton) {
            this.nextLevelButton = this.add.image(350, 680, 'next_level');
            this.nextLevelButton.setScale(.75);
            this.nextLevelButton.setInteractive();
            this.nextLevelButton.on('pointerdown', () => {
                // this.sound.play('clink_sound');
                this.nextLevelButton.destroy();
                this.nextLevelButton = null;
                this.levelOver = false;
                this.gameScene += 1;
                this.clearScreen();

                this.levelOverText.setVisible(false);
                this.ninjaStarText.setVisible(false);
                this.enemyKilledText.setVisible(false);
                enemyKilledGraphic.setVisible(false);
                ninjaStarGraphic.setVisible(false);


                this.create_scenes(this.gameScene);
            }, this);
        }

        // Show the 'Next Level' button
        this.nextLevelButton.setVisible(true);
    }

    displayBulletsRemaining() {
        // Destroy previous images
        if (this.bulletsRemainingImages.length > 0) {
            this.bulletsRemainingImages.forEach(image => image.destroy());
            this.bulletsRemainingImages = [];
        }
        let startingX = 25;
        let y = 20;
        for (let i = 0; i < this.playerBulletsRemaining; i++) {
            let x = startingX + i * 25;
            let image = this.add.image(x, y, "projectile");
            image.setScale(0.03);
            this.bulletsRemainingImages.push(image);
        }
    }

    resetGame() {
        this.isGameOver = true;
        this.score = 0;
        this.vfx.shakeCamera();
        // this.car.destroy();
        // this.physics.pause();
        this.sounds.background.stop();

        let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 400, 'pixelfont', 'Game Over', 64)
            .setOrigin(0.5)
            .setVisible(false)
            .setAngle(-15).setTint(0xFF0000);

        this.time.delayedCall(500, () => {
            gameOverText.setVisible(true);
            this.tweens.add({
                targets: gameOverText,
                y: '+=200',
                angle: 0,
                scale: { from: 0.5, to: 2 },
                alpha: { from: 0, to: 1 },
                ease: 'Elastic.easeOut',
                duration: 1500,
                onComplete: () => {
                    this.time.delayedCall(1000, this.gameOver, [], this);
                }
            });
        });
    }

    updateScore(points) {
        this.score += points;
        this.updateScoreText();
    }

    updateScoreText() {
        this.scoreText.setText(this.score);
    }

    gameOver() {
        initiateGameOver.bind(this)({
            "score": this.score
        });
    }

    pauseGame() {
        handlePauseGame.bind(this)();
    }
}

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
const orientation = "portrait";

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
        default: "arcade",
        arcade: {
            gravity: { y: 1000 },
            debug: false,
        },
    },
    dataObject: {
        name: title,
        description: description,
        instructions: instructions,
    },
    orientation: false,
};



