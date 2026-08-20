console.log('argv:', JSON.stringify(process.argv));
console.log('isElectron:', 'electron' in process.versions);
console.log('ELECTRON_RUN_AS_NODE env:', process.env.ELECTRON_RUN_AS_NODE);
