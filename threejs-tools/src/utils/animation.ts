

export class Animation {
    public state: 'inactive' | 'waiting' | 'ongoing' = 'waiting';
    public durationLeft: number = 0;
    public waitTimeLeft: number = 0;
    private lastTime: number = 0;

    constructor(
        public duration: number,
        public waitTime: number,
        public doOnAnimation: (fractionDone: number) => any
        ) {
        this.durationLeft = this.duration;
        this.waitTimeLeft = this.waitTime;
    }

    update(timeSinceAppStart: number) {
        const deltaT = timeSinceAppStart - this.lastTime;
        this.lastTime = timeSinceAppStart;

        if (this.state === 'inactive') {
            return;
        }
        if (this.state === 'waiting') {
            this.waitTimeLeft -= deltaT;
            if (this.waitTimeLeft <= 0) {
                this.state = 'ongoing';
                this.waitTimeLeft = this.waitTime;
                return this.doOnAnimation(1.0 - this.durationLeft / this.duration);
            }
            return;
        }
        if (this.state === 'ongoing') {
            this.durationLeft -= deltaT;
            if (this.durationLeft <= 0) {
                this.state = 'inactive';
                this.durationLeft = this.duration;
                return;
            } else {
                return this.doOnAnimation(1.0 - this.durationLeft / this.duration);
            }
        }
    }

    reactivateIn(offset: number = this.waitTime) {
        this.state = 'waiting';
        this.waitTimeLeft = offset;
        this.waitTime = offset;
    }
}


export class CyclicalAnimation {

    public state: 'done' | 'waiting' | 'ongoing' = 'waiting';
    private lastTime = 0;

    constructor(
        public duration: number,
        public repetitions: number = 0, // 0 interpreted as: repeat infinitely
        public waitTime: number = 0
    ) {}

    update(timeSinceAppStart: number) {
        const deltaT = timeSinceAppStart - this.lastTime;
        this.lastTime = timeSinceAppStart;
    }
}
