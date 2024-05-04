import Phaser from "phaser";
import * as braincadeSDK from "../braincadeSDK";
import VFXLibrary from "../vfxLibrary";



// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        braincadeSDK.addEventListenersPhaser.bind(this)();

        this.load.image("heart", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/heart.png");
        this.load.image("pauseButton", "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/icons/pause.png");

        this.load.image('background', 'src/assets/assets/background.png');
        this.load.image('player', 'src/assets/assets/player.png');
        this.load.image('enemy', 'src/assets/assets/enemy.png');
        this.load.image('projectile', 'src/assets/assets/projectile.png');
        this.load.image('collectible', 'src/assets/assets/collectible.png');

        this.load.audio('backgroundMusic', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/music/bgm-3.mp3']);
        this.load.audio('shoot', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/shoot_3.mp3']);
        this.load.audio('damage', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/damage_1.mp3']);
        this.load.audio('upgrade', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/upgrade_1.mp3']);
        this.load.audio('lose', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/lose_2.mp3']);
        this.load.audio('collect', ['https://aicade-ui-assets.s3.amazonaws.com/GameAssets/sfx/collect_1.mp3']);

        this.load.image('plus', this.createPlusTexture());
        const fontName = 'pix';
        const fontBaseURL = "https://aicade-ui-assets.s3.amazonaws.com/GameAssets/fonts/"
        this.load.bitmapFont('pixelfont', fontBaseURL + fontName + '.png', fontBaseURL + fontName + '.xml');

        console.log("preload");
    }

    create() {
        this.vfx = new VFXLibrary(this);
        this.isMobile = !this.sys.game.device.os.desktop;

        this.width = this.game.config.width;
        this.height = this.game.config.height;

        this.add.image(0, 0, 'background').setOrigin(0).setScrollFactor(0);

        // Add input listeners
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());

        this.input.keyboard.on('keydown-M', () => {
            this.sound.setMute(!this.sound.mute);
        });

        this.pauseButton = this.add.sprite(this.game.config.width - 60, 60, "pauseButton").setOrigin(0.5, 0.5);
        this.pauseButton.setInteractive({ cursor: 'pointer' });
        this.pauseButton.setScale(3);
        this.pauseButton.setScrollFactor(0);
        this.pauseButton.on('pointerdown', () => this.pauseGame());

        this.backgroundMusic = this.sound.add('backgroundMusic', { loop: true, volume: 1 });
        this.backgroundMusic.play();

        this.player;
        this.enemies;
        this.bullets;
        this.lastFired = 0;
        this.lastFiredDelay = 800;
        this.score = 0;
        this.scoreText;
        this.playerHealth = 100;
        this.playerSpeed = 100;
        this.healthRegenPoints = 0;
        this.healthRegenPointsRequired = 15;
        this.bulletAddPoints = 0;
        this.bulletAddPointsRequired = 10;
        this.collectibleChance = 0.8;
        this.enemySpeed = 30;
        this.gameOverTrigerred = false;

        // Create player
        this.player = this.physics.add.sprite(this.width / 2, this.height / 2, 'player').setScale(0.08);
        this.player.preFX.addShadow(0, 0, 0.1, 1, 0x000000, 6, 1);
        // this.player.postFX.addShadow();
        this.healthBar = this.add.graphics();
        this.updateHealthBar();

        // Create enemies group
        this.enemies = this.physics.add.group();

        // Create bullets group
        this.bullets = this.physics.add.group();

        this.collectibles = this.physics.add.group();

        // Set up camera to follow player
        this.cameras.main.startFollow(this.player);

        // Set up arrow key input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Display score
        this.scoreText = this.add.bitmapText(this.width / 2, 100, 'pixelfont', this.score, 64).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthIcon = this.add.image(80, 100, "plus").setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.healthText = this.add.bitmapText(180, 90, 'pixelfont', this.healthRegenPoints + "/" + this.healthRegenPointsRequired, 64).setOrigin(0.5, 0.5).setScrollFactor(0);

        this.bulletIcon = this.add.image(80, 200, "projectile").setScale(0.08).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(100);
        this.bulletText = this.add.bitmapText(180, 190, 'pixelfont', this.bulletAddPoints + "/" + this.bulletAddPointsRequired, 64).setOrigin(0.5, 0.5).setScrollFactor(0);

        // Spawn enemies
        this.time.addEvent({
            delay: 600,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        this.vfx.addCircleTexture('red', 0xFF0000, 1, 10);
        this.vfx.addCircleTexture('orange', 0xFFA500, 1, 10);
        this.vfx.addCircleTexture('yellow', 0xFFFF00, 1, 10);

        // Check for collisions between enemies and player
        this.physics.add.collider(this.player, this.enemies, this.playerEnemyCollision, null, this);
        this.physics.add.collider(this.bullets, this.enemies, this.bulletEnemyCollision, null, this);
        this.physics.add.collider(this.player, this.collectibles, this.collectCollectible, null, this);
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.playerSpeed);
            this.player.flipX = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.playerSpeed);
            this.player.flipX = false;
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-this.playerSpeed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(this.playerSpeed);
        } else {
            this.player.setVelocityY(0);
        }

        this.enemies.getChildren().forEach(enemy => {
            this.physics.moveToObject(enemy, this.player, this.enemySpeed);
        });

        // Automatic shooting
        if (this.time.now > this.lastFired) {
            this.shootBullet();
            this.lastFired = this.time.now + this.lastFiredDelay;
        }

        this.healthBar.setPosition(this.player.x - 50, this.player.y - 60);

        // Update score
        this.scoreText.setText('Score: ' + this.score);
    }

    updateHealthBar() {
        this.healthBar.clear();

        // Draw the background of the health bar
        this.healthBar.fillStyle(0x000000, 0.8);
        this.healthBar.fillRect(0, 0, 100, 10);

        // Draw the actual health level
        this.healthBar.fillStyle(0x00ff00, 1);
        this.healthBar.fillRect(0, 0, this.playerHealth, 10);
    }

    createPlusTexture() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Set the fill color to green
        graphics.fillStyle(0x00ff00);

        // Draw the horizontal bar
        graphics.fillRect(0, 15, 50, 20);

        // Draw the vertical bar
        graphics.fillRect(15, 0, 20, 50);

        // Generate the texture from the graphics object
        graphics.generateTexture('plus', 50, 50);

        // Clean up the graphics object
        graphics.destroy();

        return 'plus';
    }

    spawnEnemy() {

        const edge = Phaser.Math.Between(1, 4);
        let x, y;

        switch (edge) {
            case 1:
                x = Phaser.Math.Between(this.player.x - this.width / 2, this.player.x + this.width / 2);
                y = this.player.y - this.height / 2;
                break;
            case 2:
                x = this.player.x + this.width / 2;
                y = Phaser.Math.Between(this.player.y - this.height / 2, this.player.y + this.height / 2);
                break;
            case 3:
                x = Phaser.Math.Between(this.player.x - this.width / 2, this.player.x + this.width / 2);
                y = this.player.y + this.height / 2;
                break;
            case 4:
                x = this.player.x - this.width / 2;
                y = Phaser.Math.Between(this.player.y - this.height / 2, this.player.y + this.height / 2);
                break;
        }

        const numEnemies = Phaser.Math.Between(1, 3); // Adjust as needed
        const spacing = 100;

        for (let i = 0; i < numEnemies; i++) {
            const enemy = this.enemies.create(((i + 1) * spacing) + x, y, 'enemy');
            enemy.setScale(0.05);
            this.tweens.add({
                targets: enemy,
                scale: '+=0.01',
                duration: 200,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: i * 200 // Add delay for staggered effect
            });
            this.physics.moveToObject(enemy, this.player, this.enemySpeed);
        }
    }

    shootBullet() {
        const closestEnemy = this.findClosestEnemy(this.player.x, this.player.y);

        if (closestEnemy) {
            const bullet = this.bullets.create(this.player.x, this.player.y, 'projectile').setScale(0.025);
            this.physics.moveToObject(bullet, closestEnemy, 500);
            this.sound.add('shoot', { loop: false, volume: 0.5 }).play();
        }
    }

    findClosestEnemy(x, y) {
        let minDistance = 350;
        let closestEnemy = null;

        this.enemies.getChildren().forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
    }

    playerEnemyCollision(player, enemy) {
        this.sound.add('damage', { loop: false, volume: 1 }).play();
        this.vfx.shakeCamera(200, 0.015);
        this.vfx.createEmitter('heart', player.x, player.y, 0.025, 0, 1000).explode(10);
        this.playerHealth -= 10;
        this.updateHealthBar();
        enemy.destroy();
        if (this.playerHealth <= 0 && !this.gameOverTrigerred) {
            this.gameOverTrigerred = true;

            this.time.delayedCall(500, () => {
                let gameOverText = this.add.bitmapText(this.cameras.main.centerX, this.cameras.main.centerY - 200, 'pixelfont', 'Game Over', 64)
                    .setOrigin(0.5)
                    .setVisible(false)
                    .setAngle(-15)
                    .setDepth(100);

                this.time.delayedCall(500, () => {
                    this.sound.add('lose', { loop: false, volume: 1 }).play();
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
            });
        }
    }

    bulletEnemyCollision(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.vfx.createEmitter('red', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('yellow', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.vfx.createEmitter('orange', enemy.x, enemy.y, 1, 0, 500).explode(10);
        this.score += 10; // Increase score when enemy is destroyed

        const chance = Phaser.Math.Between(0, 100);
        if (chance < this.collectibleChance * 100) {
            this.createCollectible(enemy.x, enemy.y);
        }
    }

    createCollectible(x, y) {
        const collectible = this.physics.add.image(x, y, 'collectible').setScale(0.05);
        this.vfx.addShine(collectible, 500);
        // this.vfx.addGlow(collectible);
        this.vfx.scaleGameObject(collectible);
        this.collectibles.add(collectible);
    }

    collectCollectible(player, collectible) {
        collectible.destroy();
        this.sound.add('collect', { loop: false, volume: 1 }).play();
        this.healthRegenPoints += 1
        this.bulletAddPoints += 1
        if (this.healthRegenPoints >= this.healthRegenPointsRequired) {
            this.sound.add('upgrade', { loop: false, volume: 1 }).play();
            this.vfx.createEmitter('plus', player.x, player.y, 1, 0, 1000).explode(10);
            this.healthRegenPoints = 0
            this.playerHealth = 100;
            this.updateHealthBar();
            this.centerTextHealth = this.add.bitmapText(this.width / 2, this.height / 2, 'pixelfont', "HEALTH REGENERATED!", 64).setOrigin(0.5, 0.5).setDepth(100).setScrollFactor(0);
            this.time.delayedCall(1000, () => {
                this.centerTextHealth.destroy();
            });
        }
        if (this.bulletAddPoints >= this.bulletAddPointsRequired) {
            this.sound.add('upgrade', { loop: false, volume: 1 }).play();
            this.vfx.createEmitter('projectile', player.x, player.y, 0.025, 0, 1000).explode(10);
            this.bulletAddPoints = 0
            this.lastFiredDelay *= 0.9;
            this.centerTextWeapon = this.add.bitmapText(this.width / 2, this.height / 2 + 100, 'pixelfont', "WEAPON UPGRADED!", 64).setOrigin(0.5, 0.5).setDepth(100).setScrollFactor(0);
            this.time.delayedCall(1000, () => {
                this.centerTextWeapon.destroy();
            });
        }
        this.healthText.setText(this.healthRegenPoints + "/" + this.healthRegenPointsRequired);
        this.bulletText.setText(this.bulletAddPoints + "/" + this.bulletAddPointsRequired);
        this.score += 50; // Increase score when coin is collected
    }

    pauseGame() {
        braincadeSDK.handlePauseGame.bind(this)();
    }

    gameOver() {
        braincadeSDK.initiateGameOver.bind(this)({ score: this.score });
    }
}

// Configuration object
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
    orientation: true,
    parent: "game-container",
};

export default config;