class InteractionManager{
    constructor(parallelCoordinates, cityDurationBudgetStacked) {
        this.pubSub = new Map();
        this.parallelCoordinates = parallelCoordinates;
        this.cityDurationBudgetStacked = cityDurationBudgetStacked;

        this.parallelCoordinates.interactionManager = this;
        this.cityDurationBudgetStacked.interactionManager = this;

        this.subscribe(this.parallelCoordinates.events.brush, (data) => {
            this.cityDurationBudgetStacked.handleEvent(data);
        });
    }

    subscribe(event, callback) {
        if (!this.pubSub.has(event)) {
            this.pubSub.set(event, []);
        }
        this.pubSub.get(event).push(callback);
    }

    publish(event, data) {
        if (this.pubSub.has(event)) {
            this.pubSub.get(event).forEach(callback => callback(data));
        }
    }


}