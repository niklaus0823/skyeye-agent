class demo {
    start() {
        clearTimeout(this.tid);
        this._heathCheck();
    }
    _heathCheck() {
        console.log('heathCheck');
        setTimeout(() => {
            console.log(this);
            return this._heathCheck();
        }, 1000);
    }
}
let d = new demo();
d.start();
