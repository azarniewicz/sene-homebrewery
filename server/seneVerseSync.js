import Markdown from '../shared/markdown.js';
import { splitTextStyleAndMetadata } from '../shared/helpers.js';
import config from './config.js';
import _ from 'lodash';
import https from 'https';

const PAGEBREAK_REGEX_V3 = /^(?=\\page(?:break)?(?: *{[^\n{}]*})?$)/m;
const PAGEBREAK_REGEX_LEGACY = /\\page(?:break)?/m;
const FRONT_COVER_MARKER = '{{frontCover';
const PAGE_DIRECTIVE_LINE_REGEX = /^\s*\\page(?:break)?(?: *{[^\n{}]*})?\s*(?:\r?\n|$)/gm;

const splitPages = (text, renderer) => {
	const regex = renderer === 'legacy' ? PAGEBREAK_REGEX_LEGACY : PAGEBREAK_REGEX_V3;
	return text.split(regex);
};

const stripPageDirectives = (text) => text.replace(PAGE_DIRECTIVE_LINE_REGEX, '');

const getFrontCover = (brew) => {
	const text = brew?.text || '';
	if (!text.includes(FRONT_COVER_MARKER)) return null;
	const renderer = brew.renderer === 'legacy' ? 'legacy' : 'V3';
	const pages = splitPages(text, renderer);
	if (pages.length <= 1) return null;
	return stripPageDirectives(pages[0]);
};

const getSectionsSource = (brew) => {
	const text = brew?.text || '';
	if (!text.includes(FRONT_COVER_MARKER)) return text;
	const renderer = brew.renderer === 'legacy' ? 'legacy' : 'V3';
	const pages = splitPages(text, renderer);
	if (pages.length <= 1) return stripPageDirectives(text);
	const bodyPages = pages.slice(1);
	const joined = renderer === 'legacy' ? bodyPages.join('\n\\page\n') : bodyPages.join('');
	return stripPageDirectives(joined);
};

const renderBrewToSections = (brew) => {
	if (!brew.text || !brew.shareId || !brew.editId) return null;

	const brewCopy = _.cloneDeep(brew);
	splitTextStyleAndMetadata(brewCopy);

	const opts = Markdown.marked.defaults;
	const sectionSource = getSectionsSource(brewCopy);
	const tokens = Markdown.marked.lexer(sectionSource, opts);
	Markdown.marked.walkTokens(tokens, opts.walkTokens);

	const sections = [];
	let currentSection = null;
	let sectionTokens = [];

	for (const token of tokens) {
		if (token.type === 'heading') {
			if (currentSection) {
				currentSection.content = Markdown.marked.parser(sectionTokens, opts);
				sections.push(currentSection);
			}
			currentSection = {
				title: token.text.slice(0, 500),
				depth: token.depth
			};
			sectionTokens = [];
		}

		if (currentSection) {
			sectionTokens.push(token);
		} else {
			if (!sections.length) {
				currentSection = {
					title: brewCopy.title || 'Untitled Section',
					depth: 1
				};
				sectionTokens = [];
			}
			sectionTokens.push(token);
		}
	}

	if (currentSection) {
		currentSection.content = Markdown.marked.parser(sectionTokens, opts);
		sections.push(currentSection);
	}

	return sections;
};

const SYNC_DEBOUNCE_MS = 15000; // 15 seconds
const pendingSyncs = new Map();

const performSync = async (brew, userToken) => {
	try {
		if (!brew.shareId || !brew.editId) {
			console.log('[SeneVerseSync] Brew not yet shared or missing editId, skipping sync');
			return;
		}

		if (!brew.published) {
			console.log('[SeneVerseSync] Brew is not public, skipping sync');
			return;
		}

		if (!userToken) {
			console.warn('[SeneVerseSync] No user token provided, skipping sync');
			return;
		}

		const sections = renderBrewToSections(brew);

		if (!sections || sections.length === 0) {
			console.log('[SeneVerseSync] No sections to sync');
			return;
		}

		const brewCopy = _.cloneDeep(brew);
		splitTextStyleAndMetadata(brewCopy);
		const frontCoverMd = getFrontCover(brewCopy);
		const frontCover = frontCoverMd ? Markdown.render(frontCoverMd) : null;

		// log front cover here
		console.log('[SeneVerseSync] Front Cover:', frontCover);

		const payload = {
			id: brew.shareId,
			editId: brew.editId,
			title: brew.title || 'Untitled Brew',
			sections,
			...(frontCover && { frontCover })
		};

		const seneVerseUrl = config.get('sene_verse_internal_backend_url') || 'https://sene-verse.com';
		const url = `${seneVerseUrl}/api/sourcebooks`;

		const agent = new https.Agent({
			rejectUnauthorized: false
		});

		console.log(`[SeneVerseSync] Initiating request to ${url}`);

		const response = await new Promise((resolve, reject) => {
			const urlObj = new URL(url);
			const postData = JSON.stringify(payload);

			const options = {
				hostname: urlObj.hostname,
				port: urlObj.port || 443,
				path: urlObj.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postData),
					'Authorization': `Bearer ${userToken}`
				},
				agent
			};

			const req = https.request(options, (res) => {
				let data = '';
				res.on('data', (chunk) => data += chunk);
				res.on('end', () => resolve({ status: res.statusCode, statusText: res.statusMessage, data }));
			});

			req.on('error', reject);
			req.write(postData);
			req.end();
		});

		console.log(`[SeneVerseSync] Request completed with status: ${response.status} ${response.statusText}`);

		if (response.status < 200 || response.status >= 300) {
			console.error(`[SeneVerseSync] Error response body: ${response.data}`);
			throw new Error(`HTTP ${response.status}: ${response.data}`);
		}

		const result = JSON.parse(response.data);

		if (result?.success) {
			console.log('[SeneVerseSync] Successfully synced to Sene-Verse');
		} else {
			console.warn('[SeneVerseSync] Sync returned unexpected response:', result);
		}
	} catch (error) {
		console.error('[SeneVerseSync] Failed to sync brew to Sene-Verse:', error.message);
		console.error('[SeneVerseSync] Error stack:', error.stack);
		if (error.cause) {
			console.error('[SeneVerseSync] Error cause:', error.cause);
		}
	}
};

const syncBrewToSeneVerse = (brew, userToken) => {
	if (!brew.shareId) return;

	const existingTimeout = pendingSyncs.get(brew.shareId);
	if (existingTimeout) {
		clearTimeout(existingTimeout);
	}

	const timeout = setTimeout(() => {
		performSync(brew, userToken);
		pendingSyncs.delete(brew.shareId);
	}, SYNC_DEBOUNCE_MS);

	pendingSyncs.set(brew.shareId, timeout);
};

export default {
	syncBrewToSeneVerse,
	renderBrewToSections,
	performSync
};
