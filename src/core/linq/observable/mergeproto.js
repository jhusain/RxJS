    /**
     * Merges an observable sequence of observable sequences into an observable sequence, limiting the number of concurrent subscriptions to inner sequences.
     * Or merges two observable sequences into a single observable sequence.
     * 
     * @example
     * 1 - merged = sources.merge(1);
     * 2 - merged = source.merge(otherSource);  
     * @param {Mixed} [maxConcurrentOrOther] Maximum number of inner observable sequences being subscribed to concurrently or the second observable sequence.
     * @returns {Observable} The observable sequence that merges the elements of the inner sequences. 
     */ 
    observableProto.merge = function (maxConcurrentOrOther) {
        if (typeof maxConcurrentOrOther !== 'number') {
            return observableMerge(this, maxConcurrentOrOther);
        }
        var sources = this;
        return new AnonymousObservable(function (observer) {
            var activeCount = 0,
                group = new CompositeDisposable(),
                isStopped = false,
                q = [],
                subscribe = function (xs) {
                    var subscription = new SingleAssignmentDisposable();
                    group.add(subscription);

                    // Check for promises support
                    if (isPromise(xs)) { xs = observableFromPromise(xs); }

                    subscription.setDisposable(xs.subscribe(observer.onNext.bind(observer), observer.onError.bind(observer), function () {
                        var s;
                        group.remove(subscription);
                        if (q.length > 0) {
                            s = q.shift();
                            subscribe(s);
                        } else {
                            activeCount--;
                            if (isStopped && activeCount === 0) {
                                observer.onCompleted();
                            }
                        }
                    }));
                };
            group.add(sources.subscribe(function (innerSource) {
                if (activeCount < maxConcurrentOrOther) {
                    activeCount++;
                    subscribe(innerSource);
                } else {
                    q.push(innerSource);
                }
            }, observer.onError.bind(observer), function () {
                isStopped = true;
                if (activeCount === 0) {
                    observer.onCompleted();
                }
            }));
            return group;
        });
    };
