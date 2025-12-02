import DB     from './server/db.js';
import server from './server/app.js';
import config from './server/config.js';

DB.connect(config).then(()=>{
	const PORT = process.env.PORT || config.get('web_port') || 8000;
	server.listen(PORT, ()=>{
		const reset = '\x1b[0m';
		const bright = '\x1b[1m';
		const cyan = '\x1b[36m';
		const underline = '\x1b[4m';

		console.log(`\n\tserver started at: ${new Date().toLocaleString()}`);
		console.log(`\tserver on port: ${PORT}`);

		if(process.env.NODE_ENV === 'local') {
			console.log(`\t${bright + cyan}Open in browser: ${reset}${underline + bright + cyan}https://homebrewery.sene-verse.com.localdev:8443${reset}\n\n`);
		} else {
			console.log(`\t${bright + cyan}Open in browser: ${reset}${underline + bright + cyan}http://localhost:${PORT}${reset}\n\n`);
		}
	});
});
