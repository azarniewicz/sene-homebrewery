import request from 'superagent';

const addHeader = (req)=>req.set('Homebrewery-Version', global.version).withCredentials();

let isRefreshing = false;
let refreshPromise = null;

const refreshAuthToken = async ()=>{
	if(isRefreshing) {
		return refreshPromise;
	}
	
	isRefreshing = true;
	refreshPromise = (async ()=>{
		try {
			const response = await fetch(`${global.config.seneVerseBackendUrl}/auth/refresh`, {
				credentials: 'include',
				method: 'GET'
			});
			return response.ok;
		} catch(err) {
			console.error('Token refresh failed:', err);
			return false;
		} finally {
			isRefreshing = false;
			refreshPromise = null;
		}
	})();
	
	return refreshPromise;
};

const makeRequest = (method, path, buildRequest) => {
	return new Promise((resolve, reject) => {
		const req = buildRequest(addHeader(request[method](path)));
		
		req.end(async (err, res) => {
			if(err && err.status === 401) {
				console.log('Got 401, attempting to refresh token...');
				const refreshed = await refreshAuthToken();
				if(refreshed) {
					console.log('Token refreshed, retrying request...');
					const retryReq = buildRequest(addHeader(request[method](path)));
					retryReq.end((retryErr, retryRes) => {
						if(retryErr) return reject(retryErr);
						resolve(retryRes);
					});
				} else {
					err.refreshFailed = true;
					reject(err);
				}
			} else if(err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
};

const wrapRequest = (method) => (path) => {
	const reqBuilder = {
		_buildFn: (req) => req,
		send(data) {
			const prevBuild = this._buildFn;
			this._buildFn = (req) => prevBuild(req).send(data);
			return this;
		},
		set(key, value) {
			const prevBuild = this._buildFn;
			this._buildFn = (req) => prevBuild(req).set(key, value);
			return this;
		},
		query(params) {
			const prevBuild = this._buildFn;
			this._buildFn = (req) => prevBuild(req).query(params);
			return this;
		},
		then(onSuccess, onError) {
			return makeRequest(method, path, this._buildFn).then(onSuccess, onError);
		},
		catch(onError) {
			return makeRequest(method, path, this._buildFn).catch(onError);
		},
		end(callback) {
			makeRequest(method, path, this._buildFn)
				.then(res => callback(null, res))
				.catch(err => callback(err, null));
		}
	};
	
	return reqBuilder;
};

const requestMiddleware = {
	get    : wrapRequest('get'),
	put    : wrapRequest('put'),
	post   : wrapRequest('post'),
	delete : wrapRequest('delete'),
};

export default requestMiddleware;