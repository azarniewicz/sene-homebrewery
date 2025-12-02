import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import https from 'https';
import config from '../config.js';
import apiKeyAuth from './api-key-auth.js';

const jwksUrl = config.get('jwks_url');

const agent = new https.Agent({
	rejectUnauthorized : false
});

const client = jwksClient({
	jwksUri               : jwksUrl,
	cache                 : true,
	cacheMaxAge           : 600000,
	rateLimit             : true,
	jwksRequestsPerMinute : 100,
	requestAgent          : agent,
	strictSsl             : false
});

const assignUserContext = (req, decoded)=>{
	const email = decoded.username || decoded.email;
	const username = email ? email.split('@')[0] : decoded.sub;

	req.seneVerseUser = {
		userId : decoded.sub,
		email  : email,
		roles  : decoded.roles
	};

	req.account = {
		username : username,
		email    : email,
		userId   : decoded.sub,
		roles    : decoded.roles
	};
};

const redirectToLogin = (req, res)=>{
	const seneVerseBackendUrl = config.get('sene_verse_backend_url');
	const returnUrl = encodeURIComponent(`${req.protocol}://${req.headers.host}${req.originalUrl}`);
	return res.redirect(`${seneVerseBackendUrl}/admin/login?returnUrl=${returnUrl}`);
};

const getKey = (header, callback)=>{
	if(!header.kid) {
		console.error('JWT header missing kid (key ID)');
		return callback(new Error('JWT header missing kid'));
	}

	client.getSigningKey(header.kid, (err, key)=>{
		if(err) {
			console.error('JWKS getSigningKey error:', err, 'kid:', header.kid, 'JWKS URL:', jwksUrl);
			return callback(err);
		}
		const signingKey = key.getPublicKey();
		callback(null, signingKey);
	});
};

const verifyJwtToken = (token, req, res, next)=>{
	jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded)=>{
		if(err) {
			console.error('JWT verification failed:', err.message);
			return redirectToLogin(req, res);
		}

		assignUserContext(req, decoded);
		return next();
	});
};

const authMiddleware = (req, res, next)=>{
	if(req.headers?.authorization) {
		return apiKeyAuth(req, res, next);
	}

	const cookieToken = req.cookies?.auth_token;
	if(cookieToken) {
		return verifyJwtToken(cookieToken, req, res, next);
	}

	return redirectToLogin(req, res);
};

export default authMiddleware;
