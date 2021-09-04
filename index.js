"user strict"

var md5 = require("nodejs-md5");
var fs = require("fs");
var cors = require("cors");
var express = require("express");
var bodyParser = require('body-parser');
var killable = require('killable');
var talib = require('ta-lib');

let MAX_SESSIONS=50;

/**
 *  ERROR_CODES An enumeration of available error codes
 */
 const ERROR_CODES = { 
    RET_OK: 0,
    RET_OK_NONE: 1,
    RET_ERROR: 2,
    RET_INVALID_DATA: 3,
    RET_TECH_PROBLEM: 4,
    RET_ACCOUNT_DISABLED: 5,
    RET_BAD_ACCOUNT_INFO: 6, 

    RET_TIMEOUT: 7,
    RET_BAD_PRICES: 8,
    RET_MARKET_CLOSED: 9,
    RET_TRADE_DISABLE: 10,
    RET_NO_MONEY: 11,
    RET_PRICE_CHANGED: 12,
    RET_OFFQUOTES: 13,
    RET_BROKER_BUSY: 14,

    RET_OLD_VERSION: 15,
    RET_MULTI_CONNECT: 16,
    RET_NO_CONNECT: 17,
    RET_NOT_ENOUGH_RIGHTS: 18,
    RET_BAD_STOPS: 19,
    RET_SKIPPED: 20,
    RET_TOO_FREQUENT: 21,
    RET_INVALID_VOLUME: 22,
    RET_INVALID_HANDLE: 23,
    RET_INSTANTEXECUTION: 24
};

/**
 *  COMMANDS An enumeration of accepted commands
 */
const COMMANDS = { 
    OP_BUY: 0,
    OP_SELL: 1,
    OP_BUY_LIMIT: 2,
    OP_SELL_LIMIT: 3,
    OP_BUY_STOP: 4,
    OP_SELL_STOP: 5,
    OP_BALANCE: 6,
    OP_CREDIT: 7,
    OP_CLOSEPENDING: 8,
    OP_CLOSEALL: 9,
    OP_UNKNOWN: 10
};

/**
 *  RateInfo A class object defining currency rates
 */
class RateInfo {
    constructor() {
        this.ctm = 0;
        this.open = 0;
        this.low = 0;
        this.high = 0;
        this.close = 0;
        this.vol = 0;
    }
};

/**
 *  SESSION A class object containing basic trade session information
 */
class SESSION {
    constructor() {
		this.acctnum = 0;
		this.handle = 0;
		this.symbol = "";
		this.symbol1 = "";
		this.symbol2 = "";
		this.symbol3 = "";
		this.index = 0;
        this.magic = 0;
        this.order_status = "";
    }
};

/**
 *  ACCOUNT A class object for account information
 */
class ACCOUNT {
    constructor() {
        this.id = 0; 
        this.number = 0;
        this.balance = 0;
        this.equity = 0;
        this.leverage = 0;    
    }
};

/**
 *  CCYPAIRS A class object representing a single currency pair
 */
class CCYPAIRS
{
    constructor() {
        this.id = 0;
        this.symbol = "";
        this.handle = 0;
        this.period = 0;
        this.number = 0;    
    }
}; 

/**
 *  HISTORY A class object for holding currency rate history
 */
class HISTORY
{
    constructor() {
        this.id = 0; 
        this.symbol = ""; 
        this.open = 0;
        this.high = 0;
        this.low = 0;
        this.close = 0;
        this.volume = 0;
        this.ctm = 0;
        this.handle = 0;    
    }
};

/**
 *  HISTORYMAP A class object for mapping currency rate history
 */
class HISTORYMAP
{
    constructor(){
        this.mapfile = null;
        this.name = "";
        this.handle = 0;
        this.size = 0;    
    }
};

/**
 *  MARGIN A class object representing account margin requirements and information
 */
class MARGIN
{
    constructor(){
        this.id = 0;
        this.symbol = "";
        this.handle = 0;
        this.margininit = 0;
        this.marginmaintenance = 0;
        this.marginhead = 0;
        this.marginrequired = 0;
        this.margincalcmode = 0;
    }
};

/**
 *  MARKETINFO A class object representing the market information for a currency pair
 */
class MARKETINFO
{
    constructor(){
        this.id = 0;
        this.number = 0;
        this.symbol = "";
        this.points = 0;
        this.digits = 0;
        this.spread = 0;
        this.stoplevel = 0;
        this.lotsize = 0;
        this.tickvalue = 0;
        this.ticksize = 0;
        this.swaplong = 0;
        this.swapshort = 0;
        this.profitcalcmode = 0;
        this.freezelevel = 0;
        this.leverage = 0;
    }
};

/**
 *  RESPONSES A class object representing a common response
 */
class RESPONSES
{
    constructor(){
        this.id = 0;
        this.symbol = "";
        this.handle = 0;
        this.message = "";
        this.errorcode = 0;
        this.respcode = 0;
        this.read = 0;
        this.timestamp = "";
        this.tradeid = 0;
    }
}; 

/**
 *  TICKS A class object representing a single rate price point
 */
class TICKS
{
    constructor(){
        this.id = 0;
        this.symbol = "";
        this.margin = 0;
        this.freemargin = 0;
        this.tickdate = "";
        this.ask = 0;
        this.bid = 0;
        this.equity = 0;
    }
};

/**
 *  TRADECOMMANDS A clas object representing the trade commands
 */
class TRADECOMMANDS
{
    constructor() {
        this.id = 0;
        this.symbol = "";
        this.symbol1 = "";
        this.symbol2 = "";
        this.symbol3 = "";
        this.cmd = 0;
        this.cmd1 = 0;
        this.cmd2 = 0;
        this.cmd3 = 0;
        this.lots = 0;
        this.lots2 = 0;
        this.lots3 = 0;
        this.price = 0;
        this.slippage = 0;
        this.comment = "";
        this.color = 0;
        this.timestamp = "";
        this.completed = 0;
        this.handle = 0;
        this.magic = 0;
        this.expiration = "";
        this.stoploss = 0;
        this.takeprofit = 0;
        this.volume = 0;
        this.ticket = 0;
    }
};

// Shared among threads
class SharedMemory {
    static index = 0;
    static session_count = 0;
    static queue_position = Array(MAX_SESSIONS);
    static session = Array(MAX_SESSIONS); // SESSION

    static history = Array(MAX_SESSIONS); // RateInfo
    static ccy1history = Array(MAX_SESSIONS); // RateInfo
    static ccy2history = Array(MAX_SESSIONS); // RateInfo
    static ccy3history = Array(MAX_SESSIONS); // RateInfo

    static	bid = Array(MAX_SESSIONS);
    static	ask = Array(MAX_SESSIONS);
    static	close = Array(MAX_SESSIONS);
    static	volume = Array(MAX_SESSIONS);
    static swap_rate_long = Array(MAX_SESSIONS);
    static swap_rate_short = Array(MAX_SESSIONS);

    static account = Array(MAX_SESSIONS); // ACCOUNT
    static ccypairs = Array(MAX_SESSIONS); // CCYPAIRS
    static marketinfo = Array(MAX_SESSIONS); // MARKETINFO
    static margininfo = Array(MAX_SESSIONS); // MARGIN
    static trade_commands = Array(MAX_SESSIONS); // TRADECOMMANDS
    static response = Array(MAX_SESSIONS); // RESPONSES
    static ticks = Array(100); // TICKS
    static hHistory = Array(MAX_SESSIONS); // HANDLE
    static history_count = Array(MAX_SESSIONS);   

}

Array.matrix = function(numrows, numcols, initial) {
    var arr = [];
    for (var i = 0; i < numrows; ++i) {
        var columns = [];
        for (var j = 0; j < numcols; ++j) {
            columns[j] = initial;
        }
        arr[i] = columns;
    }
    return arr;
}

function Write(filename, data, callback) {
    fs.appendFile(filename, data, callback);
}

function Read(filename, callback) {
    fs.readFile(filename,'r',callback);
}    

function FindExistingSession(acctnum,handle,symbol) {
    let found = -1;

    for (let n=0; n<MAX_SESSIONS; n++) {
        if (SharedMemory.session[n].acctnum == Number(acctnum) &&
            SharedMemory.session[n].handle == Number(handle) &&
            SharedMemory.session[n].symbol == symbol) {
                found = n + 1;
                return found;
        }
    }

    return found;
}

function json_decode_rates(json) {
    var rates = [];
    console.log(json);
    //var obj = JSON.parse(json);
    //console.log(obj);
    /*
    var obj = json.split("{");
    obj.forEach(function(element, index){
        var obj2 = element.split("}");
        if (obj2.length == 2) {
            var rate = obj2[0].split(",");
            var rate_value = {};
            rate.forEach(function(value, index){
                var _rate = value.split(":");
                var _key = _rate[0];
                var _value = _rate[1];
                rate_value[_key] = _value;
            });
            rates.push(rate_value);    
        }
    });
    */
    return rates;
}


var app = null;
var server = null;

class MetatraderBridge {

    constructor(max_sessions=50,host="",port=3000) {
        MAX_SESSIONS = max_sessions;
    
        // Initialze session variable
        for(let i=0; i<MAX_SESSIONS; i++) {
            SharedMemory.account[i] = new ACCOUNT();
            SharedMemory.ccypairs[i] = new CCYPAIRS();
            SharedMemory.marketinfo[i] = new MARKETINFO();
            SharedMemory.margininfo[i] = new MARGIN();
            SharedMemory.response[i] = new RESPONSES();
            SharedMemory.history[i] = new RateInfo();
            SharedMemory.ccy1history[i] = new RateInfo();
            SharedMemory.ccy2history[i] = new RateInfo();
            SharedMemory.ccy3history[i] = new RateInfo();
            SharedMemory.session[i] = new SESSION();
            SharedMemory.trade_commands[i] = new TRADECOMMANDS();
        }
    
    
        for (let i=0; i<100; i++) {
            SharedMemory.ticks[i] = new TICKS();
        }

        app = express();

        app.use(cors()); // enable cors
        app.use(express.json()); // support json encoded bodies
        app.use(express.urlencoded({ extended: true })); // support encoded bodies

        app.use(function (err, req, res, next) {
            res.json({success: false, data: err.stack});
        });

        /**
         * @api {get} / Displays the available routes 
         * @apiVersion 1.0.0
         * @apiName GetRoutes
         * @apiGroup Utility
         * @apiParam nothing
         * 
         * @apiSuccess {Object} list of routes
         * @apiSuccessExample {json} Success-Response:
         * [
         *     "get -> /",
         *     "get -> /about",
         *     "get -> /md5/:password",
         *     "purge -> /Shutdown",
         *     "get -> /ResetAll",
         *     "get -> /GetMaximumSessions",
         *     "get -> /FindExistingSession/:acctnum,:symbol,:handle",
         *     "put -> /Initialize/:acctnum,:handle,:symbol,:symbol1,:symbol2,:symbol3",
         *     "put -> /InitializeCurrency1/:acctnum,:handle,:symbol",
         *     "put -> /InitializeCurrency2/:acctnum,:handle,:symbol,:magic",
         *     "put -> /InitializeCurrency3/:acctnum,:handle,:symbol,:magic",
         *     "delete -> /DeInitialize/:index",
         *     "get -> /GetSessionCount",
         *     "get -> /GetSession/:index",
         *     "get -> /GetAllSessions",
         *     "get -> /GetAllAccounts",
         *     "get -> /GetAllCurrencyPairs",
         *     "get -> /GetAllMarketInfo",
         *     "get -> /GetAllMarginInfo",
         *     "get -> /GetAllResponses",
         *     "get -> /GetAllHistory",
         *     "get -> /GetAllCurrency1History",
         *     "get -> /GetAllCurrency2History",
         *     "get -> /GetAllCurrency3History",
         *     "get -> /GetAllTradeCommands",
         *     "get -> /GetAllPrices",
         *     "get -> /GetDllVersion",
         *     "put -> /SetBidAsk/:session,:bid,:ask,:close,:volume",
         *     "get -> /GetBid/:session",
         *     "put -> /SetBid/:session,:quote",
         *     "put -> /SetBidCurrencyOne/:session,:currency,:quote",
         *     "put -> /SetBidCurrencyTwo/:session,:currency,:quote",
         *     "put -> /SetBidCurrencyThree/:session,:currency,:quote",
         *     "get -> /GetAsk/:session",
         *     "put -> /SetAsk/:session,:quote",
         *     "get -> /GetVolume/:session",
         *     "get -> /GetClose/:session",
         *     "put -> /SaveAccountInfo/:session,:number,:balance,:equity,:leverage",
         *     "get -> /GetAccountInfo/:session",
         *     "get -> /GetAccountNumber/:session",
         *     "get -> /GetAccountBalance/:session",
         *     "get -> /GetAccountEquity/:session",
         *     "get -> /GetAccountLeverage/:session",
         *     "put -> /SaveCurrencySessionInfo/:session,:symbol,:handle,:period,:number",
         *     "get -> /GetSessionCurrency/:session",
         *     "get -> /GetSessionCurrency1/:session",
         *     "get -> /GetSessionCurrency2/:session",
         *     "get -> /GetSessionCurrency3/:session",
         *     "get -> /GetSessionHandle/:session",
         *     "get -> /GetSessionPeriod/:session",
         *     "delete -> /DecrementQueuePosition/:session",
         *     "put -> /SaveMarketInfo/:session,:number,:leverage,:symbol,:points,:digits,:spread,:stoplevel",
         *     "get -> /GetDigits/:session",
         *     "get -> /GetSpread/:session",
         *     "get -> /GetStoplevel/:session",
         *     "get -> /GetPoints/:session",
         *     "put -> /SaveMarginInfo/:session,:symbol,:handle,:margininit,:marginmaintenance,:marginhedged,:marginrequired,:margincalcmode",
         *     "get -> /GetMarginInit/:session",
         *     "get -> /GetMarginMaintenance/:session",
         *     "get -> /GetMarginHedged/:session",
         *     "get -> /GetMarginRequired/:session",
         *     "get -> /GetMarginCalcMode/:session",
         *     "get -> /GetTradeOpCommands/:session",
         *     "get -> /GetTradeOpCommand/:session",
         *     "get -> /GetTradeOpCommand1/:session",
         *     "get -> /GetTradeOpCommand2/:session",
         *     "get -> /GetTradeOpCommand3/:session",
         *     "get -> /GetAllCurrencies/:session",
         *     "post -> /SaveAllCurrencies",
         *     "put -> /SaveSingleHistory/:session,:index,:time,:open,:close,:high,:low,:volume",
         *     "post -> /SaveHistory",
         *     "put -> /SaveHistory/:session,:index,:time,:open,:high,:low,:close,:volume",
         *     "post -> /SaveHistoryCcy1",
         *     "post -> /SaveHistoryCcy2",
         *     "post -> /SaveHistoryCcy3",
         *     "put -> /SaveTick/:session",
         *     "get -> /GetTick/:session",
         *     "get -> /RetrieveHistoryBufferSize/:session",
         *     "get -> /RetrieveHistorical/:session",
         *     "get -> /RetrieveHistorical/:session,:index",
         *     "get -> /RetrieveHistoricalOpen/:session,:index",
         *     "get -> /RetrieveHistoricalHigh/:session,:index",
         *     "get -> /RetrieveHistoricalLow/:session,:index",
         *     "get -> /RetrieveHistoricalClose/:session,:index",
         *     "get -> /RetrieveHistoricalVolume/:session,:index",
         *     "get -> /RetrieveHistoricalTime/:session,:index",
         *     "get -> /RetrieveHistoricalOpen2/:pair,:session,:index",
         *     "get -> /RetrieveHistoricalHigh2/:pair,:session,:index",
         *     "get -> /RetrieveHistoricalLow2/:pair,:session,:index",
         *     "get -> /RetrieveHistoricalClose2/:pair,:session,:index",
         *     "get -> /RetrieveHistoricalVolume2/:pair,:session,:index",
         *     "get -> /RetrieveHistoricalTime2/:pair,:session,:index",
         *     "put -> /SendResponse/:session,:errorcode,:respcode,:message,:ticket",
         *     "get -> /GetResponseErrorCode/:session",
         *     "get -> /GetResponseCode/:session",
         *     "get -> /GetResponseMessage/:session",
         *     "get -> /GetTicketNumber/:session",
         *     "get -> /SendTradeCommands/:session,:cmd,:symbol,:lots,:price,:stoploss,:profit",
         *     "post -> /SendTradeCommands",
         *     "get -> /SendTradeCommands2/:session,:cmd,:symbol1,:lots,:cmd2,:symbol2,:lots2,:cmd3,:symbol3,:lots3",
         *     "post -> /SendTradeCommands2",
         *     "get -> /SetOrderStatus/:session,:status",
         *     "put -> /SetOrderStatus",
         *     "get -> /GetOrderStatus/:session",
         *     "get -> /GetTradePrice/:session",
         *     "get -> /GetTradeLots/:session",
         *     "get -> /GetTradeLots2/:session",
         *     "get -> /GetTradeLots3/:session",
         *     "get -> /GetTradeStoploss/:session",
         *     "get -> /GetTradeTakeprofit/:session",
         *     "delete -> /ResetTradeCommand/:session",
         *     "get -> /GetTradeCurrency/:session",
         *     "get -> /GetTradeCurrency2/:session",
         *     "get -> /GetTradeCurrency3/:session",
         *     "get -> /GetSwapRateLong/:session",
         *     "get -> /GetSwapRateShort/:session",
         *     "get -> /SetSwapRateLong/:session,:rate",
         *     "get -> /SetSwapRateShort/:session,:rate",
         *     "get -> /PipSize/:session",
         *     "get -> /MovingAverages/:session",
         *     "get -> /TechnicalIndicators/:session,:period"
         * ]
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/'
         */
        app.get("/", function(req, res, next){
            try {
                const routes = [];
        
                app._router.stack.forEach(middleware => {
                    if (middleware.route) {
                        routes.push(`${Object.keys(middleware.route.methods)} -> ${middleware.route.path}`);
                    }
                });
                res.json(routes);
            } catch(error) {
                next(error);
            }
        });


        // Displays PACKAGE.JSON information
        /**
         * @api {get} /about Displays PACKAGE.JSON information with Cluster worker and CPU count 
         * @apiVersion 1.0.0
         * @apiName About
         * @apiGroup Utility
         * 
         * @apiParam nothing
         * 
         * @apiSuccess {Object} package json object
         * @apiSuccessExample {json} Success-Response:
         * {
         *     "name": "@presspage/metatrader-bridge",
         *     "version": "1.0.0",
         *     "description": "A Metatrader Bridge API Server",
         *     "homepage": "https://github.com/pingleware/metatrader-bridge",
         *     "bugs": {
         *         "url": "https://github.com/pingleware/metatrader-bridge/issues",
         *         "email": "presspage.entertainment@gmail.com"
         *     },
         *     "main": "index.js",
         *     "scripts": {
         *         "test": "echo \"Error: no test specified\" && exit 1",
         *         "doc": "apidoc -f index.js -e ./node_modules -o ./doc/"
         *     },
         *     "keywords": [
         *         "metatrader",
         *         "forex",
         *         "algorithmic trading"
         *     ],
         *     "repository": {
         *         "url": "https://github.com/pingleware/metratrader-bridge.git",
         *         "type": "git"
         *     },
         *     "author": {
         *         "name": "PressPage Entertainment Inc DBA PINGLEWARE",
         *         "email": "presspage.entertainment@gmail.com",
         *         "url": "https://pingleware.work"
         *     },
         *     "maintainers": [
         *         {
         *             "name": "Patrick Ingle",
         *             "email": "me@patruckingle.info",
         *             "url": "https://patrickingle.info"
         *         }
         *     ],
         *     "license": "CC-BY-4.0",
         *     "private": false,
         *     "engines": {
         *         "node": ">=6.0.0"
         *     },
         *     "engineStrict": true,
         *     "dependencies": {
         *         "body-parser": "^1.19.0",
         *         "cors": "^2.8.5",
         *         "express": "^4.17.1",
         *         "killable": "^1.0.1",
         *         "nodejs-md5": "^1.1.0",
         *         "ta-lib": "^0.11.0"
         *     }
         * }
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/about'
         * 
         */
        app.get("/about", function(req, res, next){
            try {
                var pjson = require('./package.json');
                res.json(pjson);
            } catch(error) {
                next(error);
            }
        });

        // Generates a MD5 hash from a plain text password, hash is saved to SETTINGS.JSON 
        /**
         * @api {get} /md5/:password Generates a MD5 hash from a plain text password, hash is saved to SETTINGS.JSON
         * @apiVersion 1.0.0
         * @apiName Password
         * @apiGroup Utility
         * 
         * @apiParam {string} password A plain text password to be hashed
         * 
         * @apiSuccess {Number} session The session
         * @apiSuccessExample {string} Success-Response:
         *      "5f4dcc3b5aa765d61d8327deb882cf99"
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/md5/password'
         * 
         */
        app.get('/md5/:password', function(req, res, next){
            try {
                md5.string.quiet(req.params.password, function (err, md5) {
                    if (err) {
                        res.json(err);
                    }
                    else {
                        res.json(md5);
                    }
                });
            } catch(error) {
                next(error);
            }
        });

        // Shutdowns the server with password authentication
        /**
         * @api {purge} /shutdown Shutdowns the server
         * @apiVersion 1.0.0
         * @apiName Shutdown
         * @apiGroup Utility
         * 
         * @apiParam {string} password A plain text password to be hashed
         * 
         * @apiSuccess {Number} session The session
         * @apiSuccessExample {string} Success-Response:
         *      "Server is going down NOW!"
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request PURGE 'http://localhost:3000/shutdown'
         * 
         */
        app.purge('/Shutdown', function (req, res, next) {
            try {
                res.json('Server is going down NOW!');

                server.kill(function () {
                //the server is down when this is called. That won't take long.
                });                
            } catch(error) {
                next(error);
            }
        });


        /**
         * @api {get} /ResetAll Reinitializes the save session data to zero
         * @apiVersion 1.0.0
         * @apiName ResetAll
         * @apiGroup Utility
         * 
         * @apiSuccess {Number} session The session
         * @apiSuccessExample {number} Success-Response:
         *      1
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/ResetAll'
         * 
         */
        app.get("/ResetAll", function(req, res, next){
            try {
                for(let i=0; i<MAX_SESSIONS; i++) {
                    SharedMemory.account[i] = new ACCOUNT();
                    SharedMemory.ccypairs[i] = new CCYPAIRS();
                    SharedMemory.marketinfo[i] = new MARKETINFO();
                    SharedMemory.margininfo[i] = new MARGIN();
                    SharedMemory.response[i] = new RESPONSES();
                    SharedMemory.history[i] = new RateInfo();
                    SharedMemory.ccy1history[i] = new RateInfo();
                    SharedMemory.ccy2history[i] = new RateInfo();
                    SharedMemory.ccy3history[i] = new RateInfo();
                    SharedMemory.session[i] = new SESSION();
                    SharedMemory.trade_commands[i] = new TRADECOMMANDS();
                }
                
                for (let i=0; i<100; i++) {
                    SharedMemory.ticks[i] = new TICKS();
                }
                res.json(SharedMemory);
            } catch(error) {
                next(error);
            } 
        });

        /**
         * @api {get} /GetMaximumSessions Obtains the maximum sessions allowed
         * @apiVersion 1.0.0
         * @apiName GetMaximumSessions
         * @apiGroup Session
         * 
         * @apiSuccess {Number} session The session
         * @apiSuccessExample {number} Success-Response:
         *      50
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/GetMaximumSessions'
         * 
         */
        app.get("/GetMaximumSessions", function(req, res, next){
            res.json(MAX_SESSIONS);
        });

        /**
         * @api {get} /FindExistingSession/:acctnum,:handle,:symbol Locates an existing session by account number, window handle and symbol
         * @apiVersion 1.0.0
         * @apiName FindExistingSession
         * @apiGroup Session
         * 
         * @apiParam {string} acctnum The account number 
         * @apiParam {string} handle The window handle that the ForexGeneral.ex4 is attached
         * @apiParam {string} symbol The currency pair of the above window handle
         * 
         * @apiSuccess {Number} session The session
         *      1
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request GET 'http://localhost:3000/FindExistingSession/1551102,EURUSDi,263854'
         */
        app.get("/FindExistingSession/:acctnum,:symbol,:handle", function(req, res,next){
            try {
                res.json(FindExistingSession(req.params.acctnum, req.params.handle, req.params.symbol));
            } catch(error) {
                next(error);
            }
        });
    
        /**
         * @api {put} /Initialize/:acctnum,:handle,:symbol,:symbol1,:symbol2,:symbol3 Initializes a session
         * @apiVersion 1.0.0
         * @apiName Initialize
         * @apiGroup Session
         * 
         * @apiParam {string} acctnum The account number 
         * @apiParam {string} handle The window handle that the ForexGeneral.ex4 is attached
         * @apiParam {string} symbol The currency pair of the above window handle
         * @apiParam {string} symbol1 One currency pair for triangular arbitrage
         * @apiParam {string} symbol2 One currency pair for triangular arbitrage
         * @apiParam {string} symbol3 One currency pair for triangular arbitrage
         * 
         * @apiSuccess {Number} session The session
         *      1
         * 
         * @apiExample {curl} Example usage:
         *      curl --location --request PUT 'http://localhost:3000/Initialize/1551102,132852,EURUSD,AUDJPY,CADJPY,AUDCAD' \
         *           --header 'Content-Type: application/x-www-form-urlencoded'
         */
        app.put("/Initialize/:acctnum,:handle,:symbol,:symbol1,:symbol2,:symbol3", function(req, res, next){
            try {
                for (let i=0;i<MAX_SESSIONS;i++) {
                    if (SharedMemory.session[i].index == 0 || (SharedMemory.session[i].acctnum == req.params.acctnum && SharedMemory.session[i].handle == req.params.handle)) {
                        SharedMemory.session[i].index = i+1;
                        SharedMemory.session[i].acctnum = req.params.acctnum;
                        SharedMemory.session[i].handle = req.params.handle;
                        SharedMemory.session[i].symbol = req.params.symbol;
                        SharedMemory.session[i].symbol1 = req.params.symbol1;
                        SharedMemory.session[i].symbol2 = req.params.symbol2;
                        SharedMemory.session[i].symbol3 = req.params.symbol3;

                        SharedMemory.session_count++;

                        SharedMemory.trade_commands[i].cmd = COMMANDS.OP_UNKNOWN;

                        SharedMemory.queue_position[i] = 0;

                        res.json(SharedMemory.session_count);
                        break;
                    }
                }
            } catch(error) {
                next(error);
            }
        });

    /**
     * @api {put} /InitializeCurrency1/:acctnum,:handle,:symbol,:magic Initializes a session for one of currency pair within the triad
     * @apiVersion 1.0.0
     * @apiName InitializeCurrency1
     * @apiGroup Session
     * 
     * @apiParam {string} acctnum The account number 
     * @apiParam {string} handle The window handle that the ForexGeneral.ex4 is attached
     * @apiParam {string} symbol The currency pair of the above window handle
     * 
     * @apiSuccess {Number} session The session
     *      2
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/InitializeCurrency1/1551102,263854,USDJPY,000000001'
     * 
     */
    app.put("/InitializeCurrency1/:acctnum,:handle,:symbol.:magic", function(req, res, next){
        try {
            for (let i=0;i<MAX_SESSIONS;i++) {
                if (SharedMemory.session[i].index == 0) {
                    SharedMemory.session[i].index = i+1;
                    SharedMemory.session[i].acctnum = req.params.acctnum;
                    SharedMemory.session[i].handle = req.params.handle;
                    SharedMemory.session[i].symbol1 = req.params.symbol;
                    SharedMemory.session_count++;
                    SharedMemory.trade_commands[i].cmd1 = -1;
                    SharedMemory.trade_commands[i].cmd2 = -1;
                    SharedMemory.trade_commands[i].cmd3 = -1;
                    SharedMemory.queue_position[i] = 0;
        
                    SharedMemory.session[i].magic = req.params.magic;
        
                    res.json(i+1);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * const int acctnum,const int handle,const char *symbol,const int magic
     */
    /**
     * @api {put} /InitializeCurrency2/:acctnum,:handle,:symbol,:magic Initializes a session for one of currency pair within the triad
     * @apiVersion 1.0.0
     * @apiName InitializeCurrency2
     * @apiGroup Session
     * 
     * @apiParam {string} acctnum The account number 
     * @apiParam {string} handle The window handle that the ForexGeneral.ex4 is attached
     * @apiParam {string} symbol The currency pair of the above window handle
     * @apiParam {string} magic A unique identifier
     * 
     * @apiSuccess {Number} session The session
     *      2
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/InitializeCurrency2/1551102,263854,USDJPY,000000002'
     * 
     */
   app.put("/InitializeCurrency2/:acctnum,:handle,:symbol,:magic", function(req, res, next){
        try {
            let result = -1;
    
            if (!req.params.magic) {
                res.json(result);
            } else {
                for (let i=0;i<MAX_SESSIONS;i++) {
                    if (SharedMemory.session[i].magic == req.params.magic) {
                        SharedMemory.session[i].symbol2 = req.params.symbol;
                        result = i+1;
                    }
                }
                res.json(result);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * const int acctnum,const int handle,const char *symbol,const int magic
     */
    /**
     * @api {put} /InitializeCurrency3/:acctnum,:handle,:symbol,:magic Initializes a session for one of currency pair within the triad
     * @apiVersion 1.0.0
     * @apiName InitializeCurrency3
     * @apiGroup Session
     * 
     * @apiParam {string} acctnum The account number 
     * @apiParam {string} handle The window handle that the ForexGeneral.ex4 is attached
     * @apiParam {string} symbol The currency pair of the above window handle
     * @apiParam {string} magic A unique identifier
     * 
     * @apiSuccess {Number} session The session
     *      2
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/InitializeCurrency3/1551102,263854,USDJPY,000000002'
     * 
     */
   app.put("/InitializeCurrency3/:acctnum,:handle,:symbol,:magic", function(req, res, next){
        try {
            let result = -1;
    
            if (!req.params.magic) {
                res.json(result);
            } else {
                for (let i=0;i<MAX_SESSIONS;i++) {
                    if (SharedMemory.session[i].magic == req.params.magic) {
                        SharedMemory.session[i].symbol3 = req.params.symbol;
                        result = i+1;
                    }
                }
                res.json(result);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {delete} /DeInitialize/:index Removes the following session, deinitializes
     * @apiVersion 1.0.0
     * @apiName DeInitialize
     * @apiGroup Session
     * 
     * @apiParam {number} index The session number
     * 
     * @apiSuccess {Number} session The session
     *      { 0 }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/DeInitialize/1'
     * 
     */
   app.delete("/DeInitialize/:index", function(req, res, next){
        try {
            if (req.params.index > MAX_SESSIONS || req.params.index > SharedMemory.session_count || req.params.index < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.session[req.params.index-1].index = 0;
                SharedMemory.session[req.params.index-1].acctnum = 0;
                SharedMemory.session[req.params.index-1].handle = 0;
                SharedMemory.session[req.params.index-1].symbol = "0";
                SharedMemory.trade_commands[req.params.index-1].cmd = COMMANDS.OP_UNKNOWN;
                SharedMemory.queue_position[req.params.index-1] = 0;

                if (SharedMemory.session_count > 0) {
                    SharedMemory.session_count--;
                }
            
                res.json(ERROR_CODES.RET_OK);    
            }
        } catch(error) {
            next(error);
        }
    });
    
    /**
     * @api {get} /GetSessionCount Obtains the total sessions created
     * @apiVersion 1.0.0
     * @apiName GetSessionCount
     * @apiGroup Session
     * 
     * @apiSuccess {Number} the number of active sessions
     *      { 0 }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionCount'
     */
   app.get("/GetSessionCount", function(req, res, next){
        res.json(SharedMemory.session_count);
    });
    
    /**
     * @api {get} /GetSession/:index Retrieves a single session
     * @apiVersion 1.0.0
     * @apiName GetSession
     * @apiGroup Session
     * 
     * @apiParam {number} index The session number 
     * 
     * @apiSuccess {Object} sessions An array of session objects
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *          "acctnum": "1551102",
     *          "handle": "132852",
     *          "symbol": "EURUSDi",
     *          "symbol1": "AUDJPYi",
     *          "symbol2": "CADJPYi",
     *          "symbol3": "AUDCADi",
     *          "index": 1,
     *          "magic": 0,
     *          "order_status": ""
     *      }
     * 
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSession/1'
     */
   app.get("/GetSession/:index", function(req, res, index){
        try {
            if (req.params.index > MAX_SESSIONS || req.params.index > SharedMemory.session_count || req.params.index < 0) {
                var temp = new SESSION();
                res.json(temp);
            } else {
                res.json(SharedMemory.session[req.params.index-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    
    /**
     * @api {get} /GetAllSessions Retrieves all sessions
     * @apiVersion 1.0.0
     * @apiName GetAllSessions
     * @apiGroup Session
     * 
     * @apiSuccess {Object} sessions An array of session objects
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *          [
     *              {
     *                  "acctnum": "1551102",
     *                  "handle": "132852",
     *                  "symbol": "EURUSDi",
     *                  "symbol1": "AUDJPYi",
     *                  "symbol2": "CADJPYi",
     *                  "symbol3": "AUDCADi",
     *                  "index": 1,
     *                  "magic": 0,
     *                  "order_status": ""
     *              },
     *          ]
     *      }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAllSessions'
     */
   app.get("/GetAllSessions", function(req, res, next){
        res.json(SharedMemory.session);
    });
    /**
     * @api {get} /GetAllAccounts Retrieves all account
     * @apiVersion 1.0.0
     * @apiName GetAllAccounts
     * @apiGroup Account
     * 
     * @apiSuccess {Object} sessions An array of session objects
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *          [
     *              {
     *                  "acctnum": "1551102",
     *                  "handle": "132852",
     *                  "symbol": "EURUSDi",
     *                  "symbol1": "AUDJPYi",
     *                  "symbol2": "CADJPYi",
     *                  "symbol3": "AUDCADi",
     *                  "index": 1,
     *                  "magic": 0
     *              },
     *          ]
     *      }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAllAccounts'
     */
   app.get("/GetAllAccounts", function(req, res, next){
        res.json(SharedMemory.account);
    });
    /**
     * @api {get} /GetAllCurrencyPairs Retrieves all currency pairs
     * @apiVersion 1.0.0
     * @apiName GetAllCurrencyPairs
     * @apiGroup Currency
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAllCurrencyPairs'
     * 
     * @apiSuccess {Object} currencies An array of currency objects
     */
   app.get("/GetAllCurrencyPairs", function(req, res, next){
        res.json(SharedMemory.ccypairs);
    });
    /**
     * @api {get} /GetAllMarketInfo Retrieves all market information
     * @apiVersion 1.0.0
     * @apiName GetAllMarketInfo
     * @apiGroup Market
     */
   app.get("/GetAllMarketInfo", function(req, res, next){
        res.json(SharedMemory.marketinfo);
    });
    /**
     * @api {get} /GetAllMarginInfo Retrieves all margin information
     * @apiVersion 1.0.0
     * @apiName GetAllMarginInfo
     * @apiGroup Margin
     */
   app.get("/GetAllMarginInfo", function(req, res, next){
        res.json(SharedMemory.margininfo);
    });
    /**
     * @api {get} /GetAllResponses Retrieves all responses
     * @apiVersion 1.0.0
     * @apiName GetAllResponses
     * @apiGroup Utility
     */
   app.get("/GetAllResponses", function(req, res, next){
        res.json(SharedMemory.response);
    });
    /**
     * @api {get} /GetAllHistory Retrieves all history
     * @apiVersion 1.0.0
     * @apiName GetAllHistory
     * @apiGroup History
     */
   app.get("/GetAllHistory", function(req, res, next){
        res.json(SharedMemory.history);
    });
    /**
     * @api {get} /GetAllCurrency1History Retrieves all history for the first currency pair triad
     * @apiVersion 1.0.0
     * @apiName GetAllCurrency1History
     * @apiGroup History
     */
   app.get("/GetAllCurrency1History", function(req, res, next){
        res.json(SharedMemory.ccy1history);
    });
    /**
     * @api {get} /GetAllCurrency2History Retrieves all history for the second currency pair triad
     * @apiVersion 1.0.0
     * @apiName GetAllCurrency2History
     * @apiGroup History
     */
   app.get("/GetAllCurrency2History", function(req, res, next){
        res.json(SharedMemory.ccy2history);
    });
    /**
     * @api {get} /GetAllCurrency3History Retrieves all history for the third currency pair triad
     * @apiVersion 1.0.0
     * @apiName GetAllCurrency3History
     * @apiGroup History
     */
   app.get("/GetAllCurrency3History", function(req, res, next){
        res.json(SharedMemory.ccy3history);
    });
    /**
     * @api {get} /GetAllTradeCommands Retrieves all trade commands
     * @apiVersion 1.0.0
     * @apiName GetAllTradeCommands
     * @apiGroup Trade
     */
   app.get("/GetAllTradeCommands", function(req, res, next){
        res.json(SharedMemory.trade_commands);
    });
    /**
     * @api {get} /GetAllPrices Retrieves all prices
     * @apiVersion 1.0.0
     * @apiName GetAllPrices
     * @apiGroup Trade
     */
   app.get("/GetAllPrices", function(req, res, next){
        res.json({ "bid": SharedMemory.bid, "ask": SharedMemory.ask, "close": SharedMemory.close, "volume": SharedMemory.volume});
    });
    
    /**
     * @api {get} /GetDllVersion Retrieves version and copyright information
     * @apiVersion 1.0.0
     * @apiName GetAllSessions
     * @apiGroup Utility
     */
   app.get("/GetDllVersion", function(req, res, next){
        var d = new Date();
        var pjson = require('./package.json');
        res.json("Metatrader API Version " + pjson.version + " - Copyright (c) 2009,2012-2013,2019-" + d.getFullYear() + " PressPage Entertainment Inc DBA PINGLEWARE");
    });
    /**
     * int index,double _bid,double _ask,double _close,double _volume)
     */
    /**
     * @api {put} /SetBidAsk/:session,:bid,:ask,:close,:volume Set the Bid and Ask price by the session
     * @apiVersion 1.0.0
     * @apiName SetBidAsk
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} bid The bid price
     * @apiParam {Number} ask The ask price
     * @apiParam {Number} close The close price
     * @apiParam {Number} volume The volume
     */
   app.put("/SetBidAsk/:session,:bid,:ask,:close,:volume", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.bid[req.params.session-1] = req.params.bid;
                SharedMemory.ask[req.params.session-1] = req.params.ask;
                SharedMemory.close[req.params.session-1] = req.params.close;
                SharedMemory.volume[req.params.session-1] = req.params.volume;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetBid/:session Retrieves the bid price by the session
     * @apiVersion 1.0.0
     * @apiName GetBid
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetBid/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.bid[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SetBid/:session,:quote Sets the bid price for the session
     * @apiVersion 1.0.0
     * @apiName SetBid
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.put("/SetBid/:session,:quote", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.bid[req.params.session-1] = req.params.quote;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SetBidCurrencyOne/:session,:currency,:quote Sets the bid price for the session
     * @apiVersion 1.0.0
     * @apiName SetBidCurrencyOne
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
     app.put("/SetBidCurrencyOne/:session,:currency,:quote", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.bid_currency_1[req.params.session-1] = req.params.quote;
                SharedMemory.currency_1[req.params.session-1] = req.params.currency;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SetBidCurrencyTwo/:session,:currency,:quote Sets the bid price for the session
     * @apiVersion 1.0.0
     * @apiName SetBidCurrencyTwo
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
     app.put("/SetBidCurrencyTwo/:session,:currency,:quote", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.bid_currency_2[req.params.session-1] = req.params.quote;
                SharedMemory.currency_2[req.params.session-1] = req.params.currency;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SetBidCurrencyThree/:session,:currency,:quote Sets the bid price for the session
     * @apiVersion 1.0.0
     * @apiName SetBidCurrencyThree
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
     app.put("/SetBidCurrencyThree/:session,:currency,:quote", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.bid_currency_3[req.params.session-1] = req.params.quote;
                SharedMemory.currency_3[req.params.session-1] = req.params.currency;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAsk/:session Retrieves the ask price by the session
     * @apiVersion 1.0.0
     * @apiName GetAsk
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetAsk/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.ask[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SetAsk/:session,:quote Sets the ask price for the session
     * @apiVersion 1.0.0
     * @apiName SetAsk
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.put("/SetAsk/:session,:quote", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.ask[req.params.session-1] = req.params.quote;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetVolume/:session Retrieves the volume amount by the session
     * @apiVersion 1.0.0
     * @apiName GetVolume
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetVolume/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.volume[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetClose/:session Retrieves the close price by the session
     * @apiVersion 1.0.0
     * @apiName GetClose
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetClose/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.close[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SaveAccountInfo/:session,:number,:balance,:equity,:leverage Saves the account information for the session
     * @apiVersion 1.0.0
     * @apiName SaveAccountInfo
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} number The account number
     * @apiParam {Number} balance The account balance
     * @apiParam {Number} equity The account equity
     * @apiParam {Number} leverage The account leverage
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/SaveAccountInfo/3.00000000,1551102,5000000.00000000,5000000.00000000,1000.00000000'
     */
   app.put("/SaveAccountInfo/:session,:number,:balance,:equity,:leverage", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.account[req.params.session-1].number = req.params.number;
                SharedMemory.account[req.params.session-1].balance = req.params.balance;
                SharedMemory.account[req.params.session-1].equity = req.params.equity;
                SharedMemory.account[req.params.session-1].leverage = req.params.leverage;
            
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAccountInfo/:session Retrieves the account information for the session
     * @apiVersion 1.0.0
     * @apiName GetAccountInfo
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAccountInfo/3.00000000'
     */
    app.get("/GetAccountInfo/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.account[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAccountNumber/:session Retrieves the account number by session
     * @apiVersion 1.0.0
     * @apiName GetAccountNumber
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAccountNumber/1'
     */
   app.get("/GetAccountNumber/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.account[req.params.session-1].number);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAccountBalance/:session Retrieves the account balance
     * @apiVersion 1.0.0
     * @apiName GetAccountBalance
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAccountBalance/1'
     */
   app.get("/GetAccountBalance/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.account[req.params.session-1].balance);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAccountEquity/:session Retrieves the current account equity
     * @apiVersion 1.0.0
     * @apiName GetAccountEquity
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAccountEquity/1'
     */
   app.get("/GetAccountEquity/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.account[req.params.session-1].equity);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetAccountLeverage/:session Retrieves the account leverage
     * @apiVersion 1.0.0
     * @apiName GetAccountLeverage
     * @apiGroup Account
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetAccountLeverage/1'
     */
   app.get("/GetAccountLeverage/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.account[req.params.session-1].leverage);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SaveCurrencySessionInfo/:session,:symbol,:handle,:period,:number Save the current session information
     * @apiVersion 1.0.0
     * @apiName SaveCurrencySessionInfo
     * @apiGroup Currency
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/SaveCurrencySessionInfo/1,EURUSDi,132852,1,1551102'
     * 
     * @apiSuccess {Number} session The session number just updated
     */
   app.put("/SaveCurrencySessionInfo/:session,:symbol,:handle,:period,:number", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || Number(req.params.session) < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.ccypairs[req.params.session-1].id = req.params.session;
                SharedMemory.ccypairs[req.params.session-1].symbol = req.params.symbol;
                SharedMemory.ccypairs[req.params.session-1].handle = req.params.handle;
                SharedMemory.ccypairs[req.params.session-1].period = req.params.period;
                SharedMemory.ccypairs[req.params.session-1].number = req.params.number;
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionCurrency/:session Retrieve the currency by session
     * @apiVersion 1.0.0
     * @apiName GetSessionCurrency
     * @apiGroup Currency
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionCurrency/1'
     */
   app.get("/GetSessionCurrency/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                if (typeof SharedMemory.session[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.session[req.params.session-1].symbol !== "undefined") {
                        res.json(SharedMemory.session[req.params.session-1].symbol);
                    } else {
                        res.json("ERROR symbol NOT SET");
                    }
                } else {
                    res.json("ERROR session[index] NOT SET");
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionCurrency1/:session Retrieves the first currency of the triad by session
     * @apiVersion 1.0.0
     * @apiName GetSessionCurrency1
     * @apiGroup Currency
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionCurrency1/1'
     */
   app.get("/GetSessionCurrency1/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                res.json(SharedMemory.session[req.params.session-1].symbol1);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionCurrency2/:session Retrieves the second currency of the triad by session
     * @apiVersion 1.0.0
     * @apiName GetSessionCurrency2
     * @apiGroup Currency
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionCurrency2/1'
     */
   app.get("/GetSessionCurrency2/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                res.json(SharedMemory.session[req.params.session-1].symbol2);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionCurrency3/:session Retrieves the third currency of the triad by session
     * @apiVersion 1.0.0
     * @apiName GetSessionCurrency3
     * @apiGroup Currency
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionCurrency3/1'
     */
   app.get("/GetSessionCurrency3/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                res.json(SharedMemory.session[req.params.session-1].symbol3);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionHandle/:session Retrieve the handle by session
     * @apiVersion 1.0.0
     * @apiName GetSessionHandle
     * @apiGroup Session
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionHandle/1'
     */
   app.get("/GetSessionHandle/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                res.json(SharedMemory.session[req.params.session-1].handle);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSessionPeriod/:session Retrieve the period by session
     * @apiVersion 1.0.0
     * @apiName GetSessionPeriod
     * @apiGroup Session
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/GetSessionPeriod/1'
     */
   app.get("/GetSessionPeriod/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("ERROR");
            } else {
                res.json(SharedMemory.ccypairs[req.params.session-1].period);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {delete} /DecrementQueuePosition/:session Decrenebt the session queue position
     * @apiVersion 1.0.0
     * @apiName DecrementQueuePosition
     * @apiGroup Utility
     * 
     * @apiParam {Number} session The session number
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/DecrementQueuePosition/1'
     */
   app.delete("/DecrementQueuePosition/:session", function(req, res, next){
        try {
            SharedMemory.queue_position[req.params.session]--;
            res.json(ERROR_CODES.RET_OK);
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SaveMarketInfo/:session,:number,:leverage,:symbol,:points,:digits,:spread,:stoplevel Save the current session market information
     * @apiVersion 1.0.0
     * @apiName SaveMarketInfo
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} number The index account number
     * @apiParam {Number} leverage The leverage value
     * @apiParam {String} symbol The currency pair
     * @apiParam {Number} points The points level
     * @apiParam {Number} digits The digits value
     * @apiParam {Number} spread The spread level
     * @apiParam {Number} stoplevel The stop level value
     */
   app.put("/SaveMarketInfo/:session,:number,:leverage,:symbol,:points,:digits,:spread,:stoplevel", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.marketinfo[req.params.session-1].number = req.params.number;
                SharedMemory.marketinfo[req.params.session-1].leverage = req.params.leverage;
                SharedMemory.marketinfo[req.params.session-1].symbol = req.params.symbol;
                SharedMemory.marketinfo[req.params.session-1].points = req.params.points;
                SharedMemory.marketinfo[req.params.session-1].digits = req.params.digits;
                SharedMemory.marketinfo[req.params.session-1].spread = req.params.spread;
                SharedMemory.marketinfo[req.params.session-1].stoplevel = req.params.stoplevel;
            
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetDigits/:session Get the digits by session
     * @apiVersion 1.0.0
     * @apiName GetDigits
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetDigits/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.marketinfo[req.params.session-1].digits);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSpread/:session Get the spread by session
     * @apiVersion 1.0.0
     * @apiName GetSpread
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetSpread/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.marketinfo[req.params.session-1].spread);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetStoplevel/:session Get the stop level by session
     * @apiVersion 1.0.0
     * @apiName GetStoplevel
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetStoplevel/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.marketinfo[req.params.session-1].stoplevel);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetPoints/:session Get the points by session
     * @apiVersion 1.0.0
     * @apiName GetPoints
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetPoints/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.marketinfo[req.params.session-1].points);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SaveMarginInfo/:session,:symbol,:handle,:margininit,:marginmaintenance,:marginhedged,:marginrequired,:margincalcmode Save the session margin information
     * @apiVersion 1.0.0
     * @apiName SaveMarginInfo
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} symbol
     * @apiParam {String} handle
     * @apiParam {Number} margininit
     * @apiParam {Number} marginmaintenance
     * @apiParam {Number} marginhedged
     * @apiParam {Number} marginrequired
     * @apiParam {Number} margincalcmode
     */
   app.put("/SaveMarginInfo/:session,:symbol,:handle,:margininit,:marginmaintenance,:marginhedged,:marginrequired,:margincalcmode", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.margininfo[req.params.session-1].symbol = req.params.symbol;
                SharedMemory.margininfo[req.params.session-1].handle = req.params.handle;
                SharedMemory.margininfo[req.params.session-1].margininit = req.params.margininit;
                SharedMemory.margininfo[req.params.session-1].marginmaintenance = req.params.marginmaintenance;
                SharedMemory.margininfo[req.params.session-1].marginhead = req.params.marginhedged;
                SharedMemory.margininfo[req.params.session-1].marginrequired = req.params.marginrequired;
                SharedMemory.margininfo[req.params.session-1].margincalcmode = req.params.margincalcmode;
            
                res.json(req.params.session);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetMarginInit/:session Retrieve the initial margin requirement by session
     * @apiVersion 1.0.0
     * @apiName GetMarginInit
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetMarginInit/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.margininfo[req.params.session-1].margininit);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetMarginMaintenance/:session Retrieve the margin maintenance by session
     * @apiVersion 1.0.0
     * @apiName GetMarginMaintenance
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetMarginMaintenance/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.margininfo[req.params.session-1].marginmaintenance);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetMarginHedged/:session Retrieve the margin hedged by session
     * @apiVersion 1.0.0
     * @apiName GetMarginHedged
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetMarginHedged/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.margininfo[req.params.session-1].marginhedged);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetMarginRequired/:session Retrieved the margin required by session
     * @apiVersion 1.0.0
     * @apiName GetMarginRequired
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetMarginRequired/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.margininfo[req.params.session-1].marginrequired);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetMarginCalcMode/:session Retrieve the margin calculation mode by session
     * @apiVersion 1.0.0
     * @apiName GetMarginCalcMode
     * @apiGroup Margin
     * 
     * @apiParam {Number} session The session number
     */
   app.get("/GetMarginCalcMode/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.margininfo[req.params.session-1].margincalcmode);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeOpCommands/:session Retrieve the margin calculation mode by session
     * @apiVersion 1.1.0
     * @apiName GetTradeOpCommands
     * @apiGroup Trade
     * 
     * @apiParam {Object} trade_command The trade command for the current session
     */
    app.get("/GetTradeOpCommands/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var trade_command = {
                    id: SharedMemory.trade_commands[req.params.session-1].id,
                    cmd: SharedMemory.trade_commands[req.params.session-1].cmd,
                    symbol: SharedMemory.trade_commands[req.params.session-1].symbol,
                    lots: SharedMemory.trade_commands[req.params.session-1].lots,
                    price: SharedMemory.trade_commands[req.params.session-1].price,
                    slippage: SharedMemory.trade_commands[req.params.session-1].slippage,
                    comment: SharedMemory.trade_commands[req.params.session-1].comment,
                    color: SharedMemory.trade_commands[req.params.session-1].color,
                    timestamp: SharedMemory.trade_commands[req.params.session-1].timestamp,
                    completed: SharedMemory.trade_commands[req.params.session-1].completed,
                    handle: SharedMemory.trade_commands[req.params.session-1].handle,
                    magic: SharedMemory.trade_commands[req.params.session-1].magic,
                    expiration: SharedMemory.trade_commands[req.params.session-1].expiration,
                    stoploss: SharedMemory.trade_commands[req.params.session-1].stoploss,
                    takeprofit: SharedMemory.trade_commands[req.params.session-1].takeprofit,
                    volume: SharedMemory.trade_commands[req.params.session-1].volume,
                    ticket: SharedMemory.trade_commands[req.params.session-1].ticket
                };
                res.json(trade_command);
            }
        } catch(error) {
            next(error);            
        }     
    });
    /**
     * @api {get} /GetTradeOpCommand/:session Retrieve the trade operations command by session
     * @apiVersion 1.0.0
     * @apiName GetTradeOpCommand
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeOpCommand/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].cmd);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeOpCommand1/:session Retrieve the trade opperations command for the first triad currency by session
     * @apiVersion 1.0.0
     * @apiName GetTradeOpCommand1
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeOpCommand1/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].cmd1);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeOpCommand2/:session Retrieve the trade opperations command for the second triad currency by session
     * @apiVersion 1.0.0
     * @apiName GetTradeOpCommand2
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeOpCommand2/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].cmd2);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeOpCommand3/:session Retrieve the trade opperations command for the third triad currency by session
     * @apiVersion 1.0.0
     * @apiName GetTradeOpCommand3
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeOpCommand3/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].cmd3);
            }
        } catch(error) {
            next(error);
        }
    });

    /**
     * @api {get} GetAllCurrencies
     * @apiVersion 1.0.0
     * @apiName GetAllCurrencies
     * @apiGroup History
     */
    app.get("/GetAllCurrencies/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.all_currencies[req.params.session]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {post} SaveAllCurrencies
     * @apiVersion 1.0.0
     * @apiName SaveAllCurrencies
     * @apiGroup History
     */
    app.post("/SaveAllCurrencies", function(req, res, next){
        try {
            console.log(req.body.symbols);
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || req.body.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.all_currencies[req.body.session] = req.body.symbols;
                res.json("success");
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} SaveSingleHistory
     * @apiVersion 1.0.0
     * @apiName SaveSingleHistory
     * @apiGroup History
     */
    app.put("/SaveSingleHistory/:session,:index,:time,:open,:close,:high,:low,:volume", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var _rateInfo = new RateInfo();
                _rateInfo.ctm = req.params.time;
                _rateInfo.open = req.params.open;
                _rateInfo.close = req.params.close;
                _rateInfo.high = req.params.high;
                _rateInfo.low = req.params.low;
                _rateInfo.vol = req.params.volume;
                console.log(_rateInfo);
                SharedMemory.history[Number(req.params.session-1)][Number(req.params.index)] = _rateInfo;
                res.json(_rateInfo);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {post} /SaveHistory Save history per session
     * @apiVersion 1.0.0
     * @apiName SaveHistory
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} rates A JSON string of rates
     * @apiParam {String} symbol The currency pair
     * @apiParam {Number} rates_total The total number of the rates
     * 
     * @apiSuccess {Number} error_code The error code (0=success,-1=failure)
     * 
     * @apiExample {curl} Example Usage:
     *      curl --location --request POST 'http://localhost:3000/SaveHistory' \
     *           --header 'Content-Type: application/x-www-form-urlencoded' \
     *           --data-urlencode 'session=1' \
     *           --data-urlencode 'symbol=EURUSDi' \
     *           --data-urlencode 'rates={
     *             "0": {
     *               "time": -1744830464,
     *               "open": 1.56,
     *               "low": 1.46,
     *               "high": 1.65,
     *               "close": 1.61,
     *               "volume": 1000
     *              }
     *             }' \
     *           --data-urlencode 'rates_total=1' \
     *           --data-urlencode 'handle=1328521'
     */
    app.post("/SaveHistory", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || req.body.session < 0) {
                res.json(-1);
            } else {
                /**
                 *       datetime time;         // Period start time 
                 *       double   open;         // Open price 
                 *       double   high;         // The highest price of the period 
                 *       double   low;          // The lowest price of the period 
                 *       double   close;        // Close price 
                 *       long     tick_volume;  // Tick volume 
                 *       int      spread;       // Spread 
                 *       long     real_volume;  // Trade volume 
                 */
                var rates = JSON.parse(req.body.rates);
                let session = Number(req.body.session);
                var symbol = req.body.symbol;
                let rates_total = req.body.rates_total;

                let total = 100;
                if (rates_total < 100) {
                    total = rates_total;
                }
                SharedMemory.history[session - 1] = [];
                for (let i=0; i < total ; i++) 
                {
                    var _rateInfo = new RateInfo();
                    if (typeof rates[i] !== "undefined") {
                        _rateInfo.ctm = rates[i]['time'];
                        _rateInfo.open = rates[i]['open'];
                        _rateInfo.high = rates[i]['high'];
                        _rateInfo.low = rates[i]['low'];
                        _rateInfo.close = rates[i]['close'];
                        _rateInfo.vol = rates[i]['volume'];
                        SharedMemory.history[Number(req.body.session-1)][i] = _rateInfo;    
                    }
                }
                //console.log(SharedMemory.history[session - 1]);
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} SaveHistory
     * @apiVersion 1.0.0
     * @apiName SaveHistory
     * @apiGroup History
     */
    app.put("/SaveHistory/:session,:index,:time,:open,:high,:low,:close,:volume", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (req.params.index > 100) {
                    res.json(-1);
                } else {
                    let i = Number(req.params.index);
                    let session = Number(req.params.session);
                    var _rateInfo = new RateInfo();
                    _rateInfo.ctm = req.params.time;
                    _rateInfo.open = req.params.open;
                    _rateInfo.high = req.params.high;
                    _rateInfo.low = req.params.low;
                    _rateInfo.close = req.params.close;
                    _rateInfo.vol = req.params.volume;
                    SharedMemory.history[session - 1][i] = _rateInfo;
                    //console.log(SharedMemory.history[session - 1][i]);
                    res.json(ERROR_CODES.RET_OK);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {post} /SaveHistoryCcy1 Save history for the first triad currency by session
     * @apiVersion 1.0.0
     * @apiName SaveHistoryCcy1
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} symbol The currency pair
     * @apiParam {String} rates A JSON string of rates
     * @apiParam {Number} rates_total The total number of rates
     * @apiParam {String} handle The window handle of the above currency pair
     */
    app.post("/SaveHistoryCcy1", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || req.body.session < 0) {
                res.json(-1);
            } else {
                var rates = json_decode_rates(req.body.rates);
                let session = req.body.session;
                var symbol = req.body.symbol;
                let rates_total = req.body.rates_total;

                let total = 100;
                if (rates_total < 100) {
                    total = rates_total;
                }

                SharedMemory.ccy1history[Number(session - 1)] = [];
                for (let i=0; i < total; i++) 
                {
                    var _rateInfo = new RateInfo();
                    if (typeof rates[i] !== "undefined") {
                        _rateInfo.ctm = rates[i]['time'];
                        _rateInfo.open = rates[i]['open'];
                        _rateInfo.high = rates[i]['high'];
                        _rateInfo.low = rates[i]['low'];
                        _rateInfo.close = rates[i]['close'];
                        _rateInfo.vol = rates[i]['volume'];
                        SharedMemory.ccy1history[session-1][i] = _rateInfo;
                    }
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {post} /SaveHistoryCcy2 Save history for the second triad currency by session
     * @apiVersion 1.0.0
     * @apiName SaveHistoryCcy2
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} symbol The currency pair
     * @apiParam {String} rates A JSON string of rates
     * @apiParam {Number} rates_total The total number of rates
     * @apiParam {String} handle The window handle of the above currency pair
     */
    app.post("/SaveHistoryCcy2", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || req.body.session < 0) {
                res.json(-1);
            } else {
                var rates = json_decode_rates(req.body.rates);
                let session = req.body.session;
                var symbol = req.body.symbol;
                let rates_total = req.body.rates_total;

                let total = 100;
                if (rates_total < 100) {
                    total = rates_total;
                }

                SharedMemory.ccy2history[Number(session-1)] = [];
                for (let i=0;i < total;i++) 
                {
                    var _rateInfo = new RateInfo();
                    if (typeof rates[i] !== "undefined") {
                        _rateInfo.ctm = rates[i]['time'];
                        _rateInfo.open = rates[i]['open'];
                        _rateInfo.high = rates[i]['high'];
                        _rateInfo.low = rates[i]['low'];
                        _rateInfo.close = rates[i]['close'];
                        _rateInfo.vol = rates[i]['volume'];
                        SharedMemory.ccy2history[Number(session-1)][i] = _rateInfo;
                    }
                }
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {post} /SaveHistoryCcy3 Save history for the third triad currency by session
     * @apiVersion 1.0.0
     * @apiName SaveHistoryCcy3
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {String} symbol The currency pair
     * @apiParam {String} rates A JSON string of rates
     * @apiParam {Number} rates_total The total number of rates
     * @apiParam {String} handle The window handle of the above currency pair
     */
    app.post("/SaveHistoryCcy3", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || req.body.session < 0) {
                res.json(-1);
            } else {
                var rates = json_decode_rates(req.body.rates);
                let session = req.body.session;
                var symbol = req.body.symbol;
                let rates_total = req.body.rates_total;

                let total = 100;
                if (rates_total < 100) {
                    total = rates_total;
                }

                SharedMemory.ccy3history[Number(session - 1)] = [];
                for (let i=0;i < total; i++) 
                {
                    var _rateInfo = new RateInfo();
                    if (typeof rates[i] !== "undefined") {
                        _rateInfo.ctm = rates[i]['time'];
                        _rateInfo.open = rates[i]['open'];
                        _rateInfo.high = rates[i]['high'];
                        _rateInfo.low = rates[i]['low'];
                        _rateInfo.close = rates[i]['close'];
                        _rateInfo.vol = rates[i]['volume'];
                        SharedMemory.ccy3history[Number(session - 1)][i] = _rateInfo;
                    }
                }
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            
            next(error);
        }
    });
    /**
     * @api {put} /SaveTick/:session Saves the latest market tick
     * @apiVersion 2.0.0
     * @apiName SaveTick
     * @apiGroup History
     */
     app.put("/SaveTick/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var tick = new TICKS();
                tick.symbol = req.body.symbol;
                tick.tickdate = req.body.date;
                tick.bid = req.body.bid;
                tick.ask = req.body.ask;
                SharedMemory.ticks[req.params.session] = tick;
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTick/:session Get the latest market tick
     * @apiVersion 2.0.0
     * @apiName GetTick
     * @apiGroup History
     */
    app.get("/GetTick/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                ers.json(SharedMemory.ticks[req.params.session]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoryBufferSize/:session Retrieve the history buffer size by session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoryBufferSize
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/RetrieveHistoryBufferSize/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.history.length);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistorical/:session Retrieve the history by session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistorical
     * @apiGroup History
     * 
     * @apiParam {Number} session The session count
     * 
     * @apiSuccess {Object} history The history for this currency pair
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *              "0": {
     *                  "open": 1.56,
     *                  "high": 1.65,
     *                  "low": 1.46,
     *                  "close": 1.61,
     *                  "vol": 1000
     *              },
     *      }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/RetrieveHistorical/1'
     */
    app.get("/RetrieveHistorical/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json([MAX_SESSIONS,SharedMemory.session_count,req.params.session,req.params.index]);
            } else {
                res.json(SharedMemory.history[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistorical/:session,:index Retrieve a single history period within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistorical
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     * 
     * @apiSuccessExample {json} Success-Response:
     *      HTTP/1.1 200 OK
     *      {
     *              "0": {
     *                  "open": 1.56,
     *                  "high": 1.65,
     *                  "low": 1.46,
     *                  "close": 1.61,
     *                  "vol": 1000
     *              },
     *      }
     * 
     * @apiExample {curl} Example usage:
     *      curl --location --request GET 'http://localhost:3000/RetrieveHistorical/1,0'
     */
    app.get("/RetrieveHistorical/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json([MAX_SESSIONS,session_count,req.params.session,req.params.index]);
            } else {
                res.json(SharedMemory.history[req.params.session-1][req.params.index]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalOpen/:session,:index Retrieve a single history open price within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalOpen
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalOpen/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json([MAX_SESSIONS,session_count,req.params.session,req.params.index]);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (typeof SharedMemory.history[req.params.session-1][req.params.index].open !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].open);
                        } else {
                            res.json(0.0000);
                        }        
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalHigh/:session,:index Retrieve a single history high price within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalHigh
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalHigh/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (typeof SharedMemory.history[req.params.session-1][req.params.index].high !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].high);
                        } else {
                            res.json(0.0000);
                        }
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalLow/:session,:index Retrieve a single history low price within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalLow
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalLow/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (typeof SharedMemory.history[req.params.session-1][req.params.index].low !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].low);
                        } else {
                            res.json(0.0000);
                        }
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalClose/:session,:index Retrieve a single history close price within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalClose
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalClose/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (typeof SharedMemory.history[req.params.session-1][req.params.index].close !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].close);
                        } else {
                            res.json(0.0000);
                        }
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalVolume/:session,:index Retrieve a single history volume within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalVolume
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalVolume/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (typeof SharedMemory.history[req.params.session-1][req.params.index].vol !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].vol);
                        } else {
                            res.json(0.0000);
                        }
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalTime/:session,:index Retrieve a single history time within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalTime
     * @apiGroup History
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalTime/:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                if (typeof SharedMemory.history[req.params.session-1] !== "undefined") {
                    if (typeof SharedMemory.history[req.params.session-1][req.params.index] !== "undefined") {
                        if (SharedMemory.history[req.params.session-1][req.params.index].ctm !== "undefined") {
                            res.json(SharedMemory.history[req.params.session-1][req.params.index].ctm);
                        } else {
                            res.json(0.0000);
                        }
                    } else {
                        res.json(0.0000);
                    }
                } else {
                    res.json(0.0000);
                }
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalOpen2/:pair,:session,:index Retrieve a single history open price for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalOpen2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalOpen2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].open);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].open);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].open);
                        break;
                }
                res.json(0);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalHigh2/:pair,:session,:index Retrieve a single history high price for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalHigh2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalHigh2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].high);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].high);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].high);
                        break;
                }
                res.json(0);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalLow2/:pair,:session,:index Retrieve a single history low price for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalLow2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalLow2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].low);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].low);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].low);
                        break;
                }
                res.json(0);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalClose2/:pair,:session,:index Retrieve a single history close price for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalClose2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalClose2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].close);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].close);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].close);
                        break;
                }
                res.json(0);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalVolume2/:pair,:session,:index Retrieve a single history volume for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalVolume2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalVolume2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].vol);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].vol);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].vol);
                        break;
                }
                res.json(0);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /RetrieveHistoricalTime2/:pair,:session,:index Retrieve a single history time for a specific triad currency within a session
     * @apiVersion 1.0.0
     * @apiName RetrieveHistoricalTime2
     * @apiGroup History
     * 
     * @apiParam {Number} pair
     * @apiParam {Number} session The session number
     * @apiParam {Number} index The index number
     */
    app.get("/RetrieveHistoricalTime2/:pair,:session,:index", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                switch(req.params.pair-1) {
                    case 0:
                        res.json(SharedMemory.ccy1history[req.params.session-1][req.params.index].ctm);
                        break;
                    case 1:
                        res.json(SharedMemory.ccy2history[req.params.session-1][req.params.index].ctm);
                        break;
                    case 2:
                        res.json(SharedMemory.ccy3history[req.params.session-1][req.params.index].ctm);
                        break;
                }
                res.json(0);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /SendResponse/:session,:errorcode,:respcode,:message,:ticket Send a response for a specific ticket within a session
     * @apiVersion 1.0.0
     * @apiName SendResponse
     * @apiGroup Utility
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} errorcode
     * @apiParam {Number} respcode
     * @apiParam {String} message
     * @apiParam {Number} ticket
     */
    app.put("/SendResponse/:session,:errorcode,:respcode,:message,:ticket", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.response[req.params.session-1].errorcode = req.params.errorcode;
                SharedMemory.response[req.params.session-1].respcode = req.params.respcode;
                SharedMemory.response[req.params.session-1].tradeid = req.params.ticket;
                SharedMemory.response[req.params.session-1].message = req.params.message;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetResponseErrorCode/:session Retrieve the response for a specific ticket within a session
     * @apiVersion 1.0.0
     * @apiName GetResponseErrorCode
     * @apiGroup Utility
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetResponseErrorCode/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.response[req.params.session-1].errorcode);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetResponseCode/:session Retrieve the response code within a session
     * @apiVersion 1.0.0
     * @apiName GetResponseCode
     * @apiGroup Utility
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetResponseCode/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.response[req.params.session-1].respcode);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetResponseMessage/:session Retrieve the response message within a session
     * @apiVersion 1.0.0
     * @apiName GetResponseMessage
     * @apiGroup Utility
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetResponseMessage/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("OUT_OF_BOUNDS");
            } else {
                if (SharedMemory.response[req.params.session-1].read == 0) {
                    SharedMemory.response[req.params.session-1].read = -1;
                    res.json(SharedMemory.response[req.params.session-1].message);
                } else {
                    res.json("NONE");
                }
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetTicketNumber/:session Retrieve the ticket within a session
     * @apiVersion 1.0.0
     * @apiName GetTicketNumber
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTicketNumber/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.response[req.params.session-1].tradeid);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @deprecated
     * @api {get} /SendTradeCommands/:session,:cmd,:symbol,:lots,:price,:stoploss,:profit Send new trade commands for a specific session
     * @apiVersion 1.0.0
     * @apiName SendTradeCommands
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} cmd 
     * @apiParam {String} symbol
     * @apiParam {Number} lots
     * @apiParam {Number} price
     * @apiParam {Number} stoploss
     * @apiParam {Number} profit
     */
    app.get("/SendTradeCommands/:session,:cmd,:symbol,:lots,:price,:stoploss,:profit", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.trade_commands[req.params.session-1].cmd = req.params.cmd;
                SharedMemory.trade_commands[req.params.session-1].cmd2 = -1;
                SharedMemory.trade_commands[req.params.session-1].cmd3 = -1;
                SharedMemory.trade_commands[req.params.session-1].symbol = req.params.symbol;
                SharedMemory.trade_commands[req.params.session-1].lots  = req.params.lots;
                SharedMemory.trade_commands[req.params.session-1].price = req.params.price;
                SharedMemory.trade_commands[req.params.session-1].stoploss = req.params.stoploss;
                SharedMemory.trade_commands[req.params.session-1].takeprofit = req.params.profit;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {post} /SendTradeCommands Send new trade commands for a specific session
     * @apiVersion 1.0.0
     * @apiName SendTradeCommands
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} cmd 
     * @apiParam {String} symbol
     * @apiParam {Number} lots
     * @apiParam {Number} price
     * @apiParam {Number} stoploss
     * @apiParam {Number} profit
     */
    app.post("/SendTradeCommands", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || Number(req.body.session) < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.trade_commands[req.body.session-1].cmd = req.body.cmd;
                SharedMemory.trade_commands[req.body.session-1].cmd2 = -1;
                SharedMemory.trade_commands[req.body.session-1].cmd3 = -1;
                SharedMemory.trade_commands[req.body.session-1].symbol = req.body.symbol;
                SharedMemory.trade_commands[req.body.session-1].lots  = req.body.lots;
                SharedMemory.trade_commands[req.body.session-1].price = req.body.price;
                SharedMemory.trade_commands[req.body.session-1].stoploss = req.body.stoploss;
                SharedMemory.trade_commands[req.body.session-1].takeprofit = req.body.profit;
                SharedMemory.trade_commands[req.body.session-1].comment = req.body.comment;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @deprecated
     * @api {get} /SendTradeCommands2/:session,:cmd,:symbol1,:lots,:cmd2,:symbol2,:lots2,:cmd3,:symbol3,:lots3 Send a triangular arbitrage command
     * @apiVersion 1.0.0
     * @apiName SendTradeCommands2
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} cmd 
     * @apiParam {String} symbol1
     * @apiParam {Number} lots
     * @apiParam {Number} cmd2
     * @apiParam {Number} symbol2
     * @apiParam {Number} lots2
     * @apiParam {Number} cmd3
     * @apiParam {Number} symbol4
     * @apiParam {Number} lots4
     */
    app.get("/SendTradeCommands2/:session,:cmd,:symbol1,:lots,:cmd2,:symbol2,:lots2,:cmd3,:symbol3,:lots3", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.trade_commands[req.params.session-1].cmd1 = req.params.cmd;
                SharedMemory.trade_commands[req.params.session-1].cmd2 = req.params.cmd2;
                SharedMemory.trade_commands[req.params.session-1].cmd3 = req.params.cmd3;
                SharedMemory.trade_commands[req.params.session-1].symbol1 = req.params.symbol1;
                SharedMemory.trade_commands[req.params.session-1].symbol2 = req.params.symbol2;
                SharedMemory.trade_commands[req.params.session-1].symbol3 = req.params.symbol3;
                SharedMemory.trade_commands[req.params.session-1].lots  = req.params.lots;
                SharedMemory.trade_commands[req.params.session-1].lots2  = req.params.lots2;
                SharedMemory.trade_commands[req.params.session-1].lots3  = req.params.lots3;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {post} /SendTradeCommands2 Send a triangular arbitrage command
     * @apiVersion 1.0.0
     * @apiName SendTradeCommands2
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} cmd 
     * @apiParam {String} symbol1
     * @apiParam {Number} lots
     * @apiParam {Number} cmd2
     * @apiParam {Number} symbol2
     * @apiParam {Number} lots2
     * @apiParam {Number} cmd3
     * @apiParam {Number} symbol4
     * @apiParam {Number} lots4
     */
    app.post("/SendTradeCommands2", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || Number(req.body.session) < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.trade_commands[req.body.session-1].cmd1 = req.body.cmd;
                SharedMemory.trade_commands[req.body.session-1].cmd2 = req.body.cmd2;
                SharedMemory.trade_commands[req.body.session-1].cmd3 = req.body.cmd3;
                SharedMemory.trade_commands[req.body.session-1].symbol1 = req.body.symbol1;
                SharedMemory.trade_commands[req.body.session-1].symbol2 = req.body.symbol2;
                SharedMemory.trade_commands[req.body.session-1].symbol3 = req.body.symbol3;
                SharedMemory.trade_commands[req.body.session-1].lots  = req.body.lots;
                SharedMemory.trade_commands[req.body.session-1].lots2  = req.body.lots2;
                SharedMemory.trade_commands[req.body.session-1].lots3  = req.body.lots3;
                
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @deprecated use SetOrderStatus
     * @api {get} /SendOrderStatus/:session,:status
     */
    app.get("/SetOrderStatus/:session,:status", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.session[req.params.session-1].order_status = req.params.status;
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {put} /SetOrderStatus Sets the order status of a previously placed trade
     * @apiVersion 1.1.0
     * @apiParams session
     * @apiParams status
     */
    app.put("/SetOrderStatus", function(req, res, next){
        try {
            if (req.body.session > MAX_SESSIONS || req.body.session > SharedMemory.session_count || Number(req.body.session) < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                SharedMemory.session[req.body.session-1].order_status = req.body.status;
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetOrderStatus Retrieves the order status of a session
     * @apiParams session
     */
     app.get("/GetOrderStatus/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(ERROR_CODES.RET_ERROR);
            } else {
                res.json(SharedMemory.session[req.params.session-1].order_status);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradePrice/:session Retrieve the trade price for a session
     * @apiVersion 1.0.0
     * @apiName GetTradePrice
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradePrice/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].price);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeLots/:session Retrieve the trade lots for a session
     * @apiVersion 1.0.0
     * @apiName GetTradeLots
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeLots/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].lots);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeLots2/:session Retrieve the trade lots for the second triad currency within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeLots2
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeLots2/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].lots2);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeLots3/:session Retrieve the trade lots for the third triad currency within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeLots3
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeLots3/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].lots3);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeStoploss/:session Retrieve the trade stop loss within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeStoploss
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeStoploss/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].stoploss);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeTakeprofit/:session Retrieve the trade take profit within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeTakeprofit
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeTakeprofit/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].takeprofit);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {delete} /ResetTradeCommand/:session Issues a trade command reset for a session
     * @apiVersion 1.0.0
     * @apiName ResetTradeCommand
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.delete("/ResetTradeCommand/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.trade_commands[req.params.session-1].cmd = -1;
                SharedMemory.trade_commands[req.params.session-1].cmd1 = -1;
                SharedMemory.trade_commands[req.params.session-1].cmd2 = -1;
                SharedMemory.trade_commands[req.params.session-1].cmd3 = -1;
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeCurrency/:session Retrieve the trade currency within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeCurrency
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeCurrency/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("OUT OF BOUNDS");
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].symbol);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeCurrency2/:session Retrieve the second triad trade currency within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeCurrency2
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeCurrency2/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("OUT OF BOUNDS");
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].symbol2);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetTradeCurrency3/:session Retrieve the third triad trade currency within a session
     * @apiVersion 1.0.0
     * @apiName GetTradeCurrency3
     * @apiGroup Trade
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetTradeCurrency3/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json("OUT OF BOUNDS");
            } else {
                res.json(SharedMemory.trade_commands[req.params.session-1].symbol3);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /GetSwapRateLong/:session Retrieve the long swap rate within a session
     * @apiVersion 1.0.0
     * @apiName GetSwapRateLong
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetSwapRateLong/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.swap_rate_long[req.params.session-1]);
            }
        } catch(error) {            
            next(error);
        }
    });
    /**
     * @api {get} /GetSwapRateShort/:session Retrieve the short swap rate within a session
     * @apiVersion 1.0.0
     * @apiName GetSwapRateShort
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/GetSwapRateShort/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                res.json(SharedMemory.swap_rate_short[req.params.session-1]);
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SetSwapRateLong/:session,:rate Set the long swap rate within a session
     * @apiVersion 1.0.0
     * @apiName SetSwapRateLong
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} rate The swap rate
     */
     app.get("/SetSwapRateLong/:session,:rate", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.swap_rate_long[req.params.session-1] = req.params.rate;    
                res.json(ERROR_CODES.RET_OK);    
            }
        } catch(error) {
            next(error);
        }
    });
    /**
     * @api {get} /SetSwapRateShort/:session,:rate Set the short swap rate within a session
     * @apiVersion 1.0.0
     * @apiName SetSwapRateShort
     * @apiGroup Market
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} rate The swap rate 
     */
     app.get("/SetSwapRateShort/:session,:rate", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                SharedMemory.swap_rate_short[req.params.session-1] = req.params.rate;
                res.json(ERROR_CODES.RET_OK);
            }
        } catch(error) {
            next(error);
        }
    });

    /**
     * @api {get} /PipSize/:session Calculate the pip size
     * @apiVersion 1.0.0
     * @apiName PipSize
     * @apiGroup Indicator
     * 
     * @apiParam {Number} session The session number
     */
    app.get("/PipSize/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var point = SharedMemory.point[req.params.session-1];
                var digits = SharedMemory.digits[req.params.session-1];
                var size = digits%2 == 1 ? point*10 : point;
                res.json(size);
            }
        } catch(error) {
            next(error);
        }
    });

    /**
     * @api {get} /MovingAverages/:session,:period Calculate a collection of moving averages with action prediction
     * @apiVersion 2.0.0
     * @apiName MovingAverages
     * @apiGroup Indicator
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} period The time period
     * 
     * @returns 
     * { 
     *   "summary": "Strong Buy", 
     *   // Summary Buy/Sell based on Moving Avg and Technical Indicators 
     *   "count": { "Total_Buy": "8", "Total_Sell": "3", "Total_Neutral": "1" }, 
     *   // Count Total Buys, Sells and Neutral 
     *   "moving_averages": { 
     *      "SMA": { // Simple Moving Averages 
     *         // v=Value, s=Signal 
     *         "MA5": { "v": 0.8600, "s": "Buy" }, // Based on 5 candles SMA 
     *         "MA10": { "v": 0.8800, "s": "Buy" }, // Based on 10 candles SMA 
     *         "MA20": { "v": 0.7952, "s": "Sell" }, // Based on 20 candles SMA 
     *         "MA50": { "v": 0.7976, "s": "Buy" }, 
     *         "MA100": { "v": 0.6894, "s": "Buy" }, 
     *         "MA200": { "v": 0.6580, "s": "Neutral" } 
     *      }, 
     *      "EMA": { // Exponential Moving Averages 
     *         "MA5": { "v": 0.8600, "s": "Buy" }, // Based on 5 candles EMA 
     *         "MA10": { "v": 0.8800, "s": "Buy" }, // Based on 10 candles EMA 
     *         "MA20": { "v": 0.7952, "s": "Sell" }, // Based on 20 candles EMA 
     *         "MA50": { "v": 0.7976, "s": "Buy" }, 
     *         "MA100": { "v": 0.6894, "s": "Buy" }, 
     *         "MA200": { "v": 0.6580, "s": "Sell" } 
     *      }, 
     *      "summary": "Buy" // Buy/Sell judgment only based on Moving Avg 
     *   } 
     * }
     */
     app.get("/MovingAverages/:session", function(req, res, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var count = SharedMemory.history[Number(req.params.session-1)].length;
                var close = [];
                for (var i=0; i<100; i++) {
                    close[i] = Number(SharedMemory.history[Number(req.params.session-1)][i].close);
                }
                var sma5 = talib.SMA(close,5);
                var sma10 = talib.SMA(close,10);
                var sma20 = talib.SMA(close,20);
                var sma50 = talib.SMA(close,50);
                var sma100 = talib.SMA(close,100);
                var sma200 = talib.SMA(close,200);

                var ema5 = talib.EMA(close,5);
                var ema10 = talib.EMA(close,10);
                var ema20 = talib.EMA(close,20);
                var ema50 = talib.EMA(close,50);
                var ema100 = talib.EMA(close,100);
                var ema200 = talib.EMA(close,200);

                res.json(
                    {
                        summary: "Not implemented!",
                        count: { 
                            Total_Buy: 0, 
                            Total_Sell: 0, 
                            Total_Neutral: 0
                        },
                        moving_averages: {
                            SMA: {
                                MA5: { v: sma5[0], s: "N/A"},
                                MA10: { v: sma10[0], s: "N/A"},
                                MA20: { v: sma20[0], s: "N/A"},
                                MA50: { v: sma50[0], s: "N/A"},
                                MA100: { v: sma100[0], s: "N/A"},
                                MA200: { v: sma200[0], s: "N/A"}
                            },
                            EMA: {
                                MA5: { v: ema5[0], s: "N/A"},
                                MA10: { v: ema10[0], s: "N/A"},
                                MA20: { v: ema20[0], s: "N/A"},
                                MA50: { v: ema50[0], s: "N/A"},
                                MA100: { v: ema100[0], s: "N/A"},
                                MA200: { v: ema200[0], s: "N/A"}
                            },
                            summary: "Not implemented!"
                        }
                    }
                );
            }
        } catch(error) {
            next(error);
        }
    });

    /**
     * @api {get} /TechnicalIndicators/:session,:period Calculate a collection of technical indicators with action prediction
     * @apiVersion 2.0.0
     * @apiName TechnicalIndicators
     * @apiGroup Indicator
     * 
     * @apiParam {Number} session The session number
     * @apiParam {Number} period The time period
     * 
     * @returns 
     * { 
     *   "summary": "Strong Buy", 
     *   // Summary Buy/Sell based on Moving Avg and Technical Indicators 
     *   "count": { "Total_Buy": "6" , "Total_Sell": "1", "Total_Neutral": "1" }, 
     *   // Count Total Buys, Sells and Neutral 
     *   "indicators": { 
     *      "RSI": { "v": 57.823, "s": "Buy" }, // RSI (14) 
     *      "STOCH": { "v": 76.209, "s": "Buy" }, // Stochastic (9,6) 
     *      "STOCHRSI": { "v": 81.306, "s": "Overbought" }, // STOCH (14,6) + RSI(14) 
     *      "MACD": { "v": "0.001", "s": "Buy" }, // MACD (12,26) 
     *      "Williams": { "v": -19.355, "s": "Overbought" }, // Williams %R 
     *      "CCI": { "v": 105.315, "s": "Buy" }, // CCI (14) 
     *      "ATR": { "v": 0.0007 , "s": "Less Volatility" }, // ATR (14) 
     *      "UO": { "v": 65.45, "s": "Buy" }, // Ultimate Oscillator 
     *      "ROC": { "v": 0.142, "s": "Buy" }, // ROC 
     *      "summary": "Strong Buy" // Buy/Sell judgment only based on above Indicators 
     *   }
     * }
     */
    app.get("/TechnicalIndicators/:session,:period", function(req, ers, next){
        try {
            if (req.params.session > MAX_SESSIONS || req.params.session > SharedMemory.session_count || req.params.session < 0) {
                res.json(-1);
            } else {
                var count = SharedMemory.history[Number(req.params.session-1)].length;
                var close = [];
                var high = [];
                var low = [];
                for (var i=0; i<100; i++) {
                    high[i] = Number(SharedMemory.history[Number(req.params.session-1)][i].high);
                    low[i] = Number(SharedMemory.history[Number(req.params.session-1)][i].low);
                    close[i] = Number(SharedMemory.history[Number(req.params.session-1)][i].close);
                }

                var rsi = talib.RSI(close, 14);
                var stochastic = talib.STOCH(close, 9);
                var stochrsi = talib.STOCHRSI(close, 9);
                var macd = talib.MACD(close, 26);
                var williams = talib.WILLR(high,low,close,10);
                var cci = talib.CCI(close, 14);
                var atr = talib.ATR(close, 14);
                var uo = talib.UO(close);
                var roc = talib.ROC(close);

                res.json(
                    {
                        summary: "Not implemented",
                        count: { Total_Buy: 0, Total_Sell: 0, Total_Neutral: 0 },
                        indicators: {
                            RSI: { v: rsi, s: "N/A" },
                            STOCH: { v: stochastic, s: "N/A" },
                            STOCHRSI: { v: stochrsi, s: "N/A" },
                            MACD: { v: macd, s: "N/A" },
                            Williams: { v: williams, s: "N/A" },
                            CCI: { v: cci, s: "N/A" },
                            ATR: { v: atr, s: "N/A" },
                            UO: { v: uo, s: "N/A" },
                            ROC: { v: roc, s: "N/A" },
                            summary: "Not implemented"
                        }                        
                    }
                );
            }
        } catch(error) {
            next(error);
        }
    });


        /**
         * Start the API Server
         */
        server = app.listen(port, () => {
            console.log("Server running on port " + port);
        });
        killable(server);
    }
}



module.exports = {
    SharedMemory,
    MetatraderBridge
}