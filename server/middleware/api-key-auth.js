import config from '../config.js';

const apiKeyAuthMiddleware = (req, res, next)=>{
	const configuredApiKey = config.get('api_key');

	if(!configuredApiKey) {
		return res.status(503).json({
			error : 'API key authentication not configured'
		});
	}

	const authHeader = req.headers.authorization;

	if(!authHeader) {
		return res.status(401).json({
			error : 'Authorization header required'
		});
	}

	const token = authHeader.replace('Bearer ', '');

	if(token !== configuredApiKey) {
		return res.status(403).json({
			error : 'Invalid API key'
		});
	}

	next();
};

export default apiKeyAuthMiddleware;
