/**
 * Countdown Timer Component
 * Reusable timer for practice modes
 */

class CountdownTimer {
    constructor(options = {}) {
        this.duration = options.duration || 60;
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.tickInterval = options.tickInterval || 100;

        this.remaining = this.duration * 1000;
        this.isRunning = false;
        this.intervalId = null;
        this.startTime = null;
        this.pausedTime = null;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.startTime = Date.now();

        if (this.pausedTime !== null) {
            // Resume from pause
            this.startTime = Date.now() - (this.duration * 1000 - this.remaining);
        }

        this.intervalId = setInterval(() => this.tick(), this.tickInterval);
        this.tick();
    }

    tick() {
        const elapsed = Date.now() - this.startTime;
        this.remaining = Math.max(0, this.duration * 1000 - elapsed);

        this.onTick({
            remaining: this.remaining,
            seconds: Math.ceil(this.remaining / 1000),
            progress: this.remaining / (this.duration * 1000)
        });

        if (this.remaining <= 0) {
            this.stop();
            this.onComplete();
        }
    }

    pause() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.pausedTime = this.remaining;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    stop() {
        this.isRunning = false;
        this.pausedTime = null;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    reset(newDuration = null) {
        this.stop();
        if (newDuration !== null) {
            this.duration = newDuration;
        }
        this.remaining = this.duration * 1000;
        this.pausedTime = null;
    }

    getRemaining() {
        return this.remaining;
    }

    getSeconds() {
        return Math.ceil(this.remaining / 1000);
    }
}

/**
 * Quick countdown for count check (5 seconds)
 */
class QuickCountdown {
    constructor(options = {}) {
        this.duration = options.duration || 5;
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});

        this.remaining = this.duration;
        this.intervalId = null;
    }

    start() {
        this.remaining = this.duration;
        this.onTick(this.remaining);

        this.intervalId = setInterval(() => {
            this.remaining--;
            this.onTick(this.remaining);

            if (this.remaining <= 0) {
                this.stop();
                this.onComplete();
            }
        }, 1000);
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    reset() {
        this.stop();
        this.remaining = this.duration;
    }
}
