/**
 * @file promise class
 * @desc promise implents
 * @author calibur
 * @reference
 * promise A+				https://promisesaplus.com/
 * promise A+ 译文 	         https://www.ituring.com.cn/article/66566
 * promise API 			    http://es6.ruanyifeng.com/#docs/promise
 * @test promises-aplus-tests
 * @time 2019-11-04
*/

const CaliburPromise = (function() {

  const STATUS = '[[PromiseStatus]]',
  		VALUE = '[[PromiseValue]]',
  		INIT = 'pending',
  		FULFILL = 'resolve',
  		REJECT = 'reject',
			NOOP = function() {};
			
  /**
	 * @refenerce toString
	*/
	function toString(val) {
		return Object.prototype.toString.call(val);
	}

	/** @desc 柯里化 */
	function curry(fn, ...values) {
		return function(...val) {
			return fn.apply(this, [...values, ...val]);	
		}	
	}

	// 是不是函数
	function isFunc(val) {
		return toString(val) === '[object Function]';
	}

	// 是不是对象
	function isObject(val) {
		return toString(val) === '[object Object]';
	}

	// promise的解决过程
	function resolve(promise, value) {
		if (promise[STATUS] !== INIT) return;
	
		// value和promise相等
		if (promise === value) {
			const error = new TypeError(
				'Chaining cycle detected for promise #<CaliburPromise>'
			);
	
			if (promise.rejects.getSize() === 0) throw error;
			
			reject(promise, error);
	
			return;
		}
	
		// value 是 promise
		if (value instanceof CaliburPromise) {
			value.then(
				curry(resolve, promise),
				curry(reject, promise),
			)
			return;
		}
	
		// TODO x 为对象或者函数
		if (isObject(value) || isFunc(value)) {
			let called;

			function callOnce(...values) {
				if (called) return;
				called = true;
				curry.apply(null, values)();
			}

			try {
				const then = value.then; // TODO why?
				if (isFunc(then)) {
					then.call(
						value,
						curry(callOnce, resolve, promise),
						curry(callOnce, reject, promise),
					);	
					return;
				}
			} catch(e) {
				callOnce(reject, promise, e);
				return;
			}
		}
	
		promise[STATUS] = FULFILL;
		promise[VALUE] = value;
		promise.fulfills.forEach((fullfill) => {
			fullfill(value);
		});
	}

	// promise的拒绝过程
	function reject(promise, reason) {
		if (promise[STATUS] !== INIT) return;
	
		promise[STATUS] = REJECT;
		promise[VALUE] = reason;
		promise.rejects.forEach((reject) => {
			reject(reason);
		});
	}

	// 对订阅promise状态变化的回调封装
	// 根据状态改变then 返回的promise的状态
	function wrapCallBack(callBack, retResolve, retReject, value) {
		setTimeout(() => {
			try {
				const ret = callBack(value);
				retResolve(ret);
			} catch(e) {
				retReject(e);
			}
		})
	}

	function helperAll(promises, resolve, reject) {
		const len = promises.length;
		const ress = [];

		ress.push = function(val) {
			Array.prototype.push.call(this, val);

			if (ress.length === len) {
				resolve([...ress]);
			}
		}

		if (len === 0) return resolve(ress);

		promises.forEach(promise => {
			promise.then(
				res => ress.push(res),
				reason => reject(reason)
			);
		});
	}

	// 用来实现CaliburPromise.all
	function mixin(obj, prop, value) {
		Object.assign(obj.prototype, { [prop]: value });
	}

  class CaliburPromiseEvent {

		constructor() {
			this.events = [];
		}

		push(cb) {
			this.events.push(cb);
			if (this.root[STATUS] === this.name) {
				this.forEach(cb => cb(this.root[VALUE]));
			}
		}

		forEach(ergodicFunc) {
			let func = this.events.shift();	
			let index = 0;

			while(isFunc(func)) {
				ergodicFunc(func, index);
				index += 1;
				func = this.events.shift();
			}
		}

		getSize() {
			return this.events.length;
		}
	}
	
	class CaliburPromiseFulFillEvent extends CaliburPromiseEvent {
		constructor(root) {
			super();

			this.init(root);
		}

		init(root) {
			this.root = root;
			this.name = FULFILL;
		}
	}

	class CaliburPromiseRejectEvent extends CaliburPromiseEvent {
		constructor(root) {
			super();

			this.init(root);
		}

		init(root) {
			this.root = root;
			this.name = REJECT;
		}
	}

	class CaliburPromise {
		constructor(cb) {
			this.init(cb);
		}
	
		init(cb) {
			this[STATUS] = INIT;
	
			this.fulfills = new CaliburPromiseFulFillEvent(this);
			this.rejects = new CaliburPromiseRejectEvent(this);
			try {
				curry(
					cb,
					curry(resolve, this),
					curry(reject, this)
				)();
			} catch(e) {
				reject(this, e);	
			}
		}
	}

	// 注册promise回调
	function __then(onFulfilled, onRejected) {
		let resolve, reject;
		const ret = new CaliburPromise(
			(a, b) => { resolve = a; reject = b; }
		);
	
		onFulfilled = isFunc(onFulfilled) ? onFulfilled : ret => ret;
		onRejected = isFunc(onRejected) ? onRejected : reason => { throw reason };
	
		this.fulfills.push(curry(wrapCallBack, onFulfilled, resolve, reject));
		this.rejects.push(curry(wrapCallBack, onRejected, resolve, reject));
	
		return ret;
	}

	// 注册promise回调
	function __catch(onRejected) {
		return this.then(null, onRejected);
	}

	function __resolve(value) {
		return new CaliburPromise(resolve => resolve(value));
	}

  function __reject(reason) {
		return new CaliburPromise((resolve, reject) => reject(reason));
	}
	
	function __all(promises = []) {
		let retResolve, retReject;
		const ret = new CaliburPromise((resolve, reject) => {
			retResolve = resolve;
			retReject = reject;
		});

		helperAll(promises, retResolve, retReject);

		return ret;
	}

	function __race(promises = []) {
		return new CaliburPromise((resolve, reject) => {
			promises.forEach(promise => {
					promise.then(resolve, reject);
			});
		});
	}

	CaliburPromise.resolve = __resolve;
	CaliburPromise.reject = __reject;
	CaliburPromise.all = __all;
	CaliburPromise.race = __race;	

	mixin(CaliburPromise, 'then', __then);
	mixin(CaliburPromise, 'catch', __catch);

	return CaliburPromise;
}());

/** 测试代码 创建promise*/
// function createPromise(flag, value) {
// 	let retResolve, retReject;
// 		const ret = new CaliburPromise((resolve, reject) => {
// 			retResolve = resolve;
// 			retReject = reject;
// 		});

// 	if (flag) retResolve(value);
// 	else 	retReject(value);

// 		return ret;
// }

module.exports = CaliburPromise;