"use strict"

const {SharedMemory, MetatraderBridge} = require('@presspage/metatrader-bridge');

new MetatraderBridge(); // use defaults: MAXSESSIONS=50, port=3000, host=localhost
