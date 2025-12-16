let headingHierarchy = [];

const slugify = (text)=>{
	const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;
	const unescape = (html)=>{
		return html.replace(unescapeTest, (_, n)=>{
			n = n.toLowerCase();
			if(n === 'colon') return ':';
			if(n.charAt(0) === '#') {
				return n.charAt(1) === 'x'
					? String.fromCharCode(parseInt(n.substring(2), 16))
					: String.fromCharCode(+n.substring(1));
			}
			return '';
		});
	};

	const raw = unescape(text)
		.trim()
		.replace(/<[!\/a-z].*?>/gi, '');

	const regex = /[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g;
	return raw.toLowerCase().replace(regex, '').replace(/ /g, '-');
};

export const resetHeadingIDs = ()=>{
	headingHierarchy = [];
};

export const customHeadingId = ()=>{
	return {
		headerIds      : false,
		useNewRenderer : true,
		renderer       : {
			heading({ tokens, depth }) {
				const text = this.parser.parseInline(tokens);
				const baseSlug = slugify(text);
				const level = depth;

				while (headingHierarchy.length > 0 && headingHierarchy[headingHierarchy.length - 1].level >= level) {
					headingHierarchy.pop();
				}

				const parent = headingHierarchy.length > 0 ? headingHierarchy[headingHierarchy.length - 1] : null;
				const id = parent ? `${parent.slug}-${baseSlug}` : baseSlug;

				headingHierarchy.push({ level, slug: baseSlug, id });

				return `<h${level} id="${id}">${text}</h${level}>\n`;
			}
		}
	};
};
