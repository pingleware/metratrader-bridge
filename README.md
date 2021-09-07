# metatrader-bridge
A NodeJS module for integrating Metatrader with an external application. See more at (https://forexgeneral.info)

# Installation
To install,

    npm i @presspage/metatrader-bridge

# Getting Starting
To use in a standard NodeJS file, first import the module,

    const {SharedMemory, MetatraderBridge} = require('@presspage/metatrader-bridge);

then initialize a new instance,

    new MetatraderBridge();

uses the default parameters,

    MAX_SESSIONS = 50
    HOST = localhost
    PORT = 3000

or, change the default paramters,

    new MetatraderBridge(max_sessions,host,port);

# Functions

    "get -> /",
    "get -> /about",
    "get -> /md5/:password",
    "purge -> /Shutdown",
    "get -> /ResetAll",
    "get -> /GetMaximumSessions",
    "get -> /FindExistingSession/:acctnum,:symbol,:handle",
    "put -> /Initialize/:acctnum,:handle,:symbol,:symbol1,:symbol2,:symbol3",
    "put -> /InitializeCurrency1/:acctnum,:handle,:symbol.:magic",
    "put -> /InitializeCurrency2/:acctnum,:handle,:symbol,:magic",
    "put -> /InitializeCurrency3/:acctnum,:handle,:symbol,:magic",
    "delete -> /DeInitialize/:index",
    "get -> /GetSessionCount",
    "get -> /GetSession/:index",
    "get -> /GetAllSessions",
    "get -> /GetAllAccounts",
    "get -> /GetAllCurrencyPairs",
    "get -> /GetAllMarketInfo",
    "get -> /GetAllMarginInfo",
    "get -> /GetAllResponses",
    "get -> /GetAllHistory",
    "get -> /GetAllCurrency1History",
    "get -> /GetAllCurrency2History",
    "get -> /GetAllCurrency3History",
    "get -> /GetAllTradeCommands",
    "get -> /GetAllPrices",
    "get -> /GetDllVersion",
    "get -> /GetVersion",
    "put -> /SetBidAsk/:session,:bid,:ask,:close,:volume",
    "get -> /GetBid/:session",
    "put -> /SetBid/:session,:quote",
    "put -> /SetBidCurrencyOne/:session,:currency,:quote",
    "put -> /SetBidCurrencyTwo/:session,:currency,:quote",
    "put -> /SetBidCurrencyThree/:session,:currency,:quote",
    "get -> /GetAsk/:session",
    "put -> /SetAsk/:session,:quote",
    "get -> /GetVolume/:session",
    "get -> /GetClose/:session",
    "put -> /SaveAccountInfo/:session,:number,:balance,:equity,:leverage",
    "get -> /GetAccountInfo/:session",
    "get -> /GetAccountNumber/:session",
    "get -> /GetAccountBalance/:session",
    "get -> /GetAccountEquity/:session",
    "get -> /GetAccountLeverage/:session",
    "put -> /SaveCurrencySessionInfo/:session,:symbol,:handle,:period,:number",
    "get -> /GetSessionCurrency/:session",
    "get -> /GetSessionCurrency1/:session",
    "get -> /GetSessionCurrency2/:session",
    "get -> /GetSessionCurrency3/:session",
    "get -> /GetSessionHandle/:session",
    "get -> /GetSessionPeriod/:session",
    "delete -> /DecrementQueuePosition/:session",
    "put -> /SaveMarketInfo/:session,:number,:leverage,:symbol,:points,:digits,:spread,:stoplevel",
    "get -> /GetDigits/:session",
    "get -> /GetSpread/:session",
    "get -> /GetStoplevel/:session",
    "get -> /GetPoints/:session",
    "put -> /SaveMarginInfo/:session,:symbol,:handle,:margininit,:marginmaintenance,:marginhedged,:marginrequired,:margincalcmode",
    "get -> /GetMarginInit/:session",
    "get -> /GetMarginMaintenance/:session",
    "get -> /GetMarginHedged/:session",
    "get -> /GetMarginRequired/:session",
    "get -> /GetMarginCalcMode/:session",
    "get -> /GetTradeOpCommands/:session",
    "get -> /GetTradeOpCommand/:session",
    "get -> /GetTradeOpCommand1/:session",
    "get -> /GetTradeOpCommand2/:session",
    "get -> /GetTradeOpCommand3/:session",
    "get -> /GetAllCurrencies/:session",
    "post -> /SaveAllCurrencies",
    "put -> /SaveSingleHistory/:session,:index,:time,:open,:close,:high,:low,:volume",
    "post -> /SaveHistory",
    "put -> /SaveHistory/:session,:index,:time,:open,:high,:low,:close,:volume",
    "post -> /SaveHistoryCcy1",
    "post -> /SaveHistoryCcy2",
    "post -> /SaveHistoryCcy3",
    "put -> /SaveTick/:session",
    "get -> /GetTick/:session",
    "get -> /RetrieveHistoryBufferSize/:session",
    "get -> /RetrieveHistorical/:session",
    "get -> /RetrieveHistorical/:session,:index",
    "get -> /RetrieveHistoricalOpen/:session,:index",
    "get -> /RetrieveHistoricalHigh/:session,:index",
    "get -> /RetrieveHistoricalLow/:session,:index",
    "get -> /RetrieveHistoricalClose/:session,:index",
    "get -> /RetrieveHistoricalVolume/:session,:index",
    "get -> /RetrieveHistoricalTime/:session,:index",
    "get -> /RetrieveHistoricalOpen2/:pair,:session,:index",
    "get -> /RetrieveHistoricalHigh2/:pair,:session,:index",
    "get -> /RetrieveHistoricalLow2/:pair,:session,:index",
    "get -> /RetrieveHistoricalClose2/:pair,:session,:index",
    "get -> /RetrieveHistoricalVolume2/:pair,:session,:index",
    "get -> /RetrieveHistoricalTime2/:pair,:session,:index",
    "put -> /SendResponse/:session,:errorcode,:respcode,:message,:ticket",
    "get -> /GetResponseErrorCode/:session",
    "get -> /GetResponseCode/:session",
    "get -> /GetResponseMessage/:session",
    "get -> /GetTicketNumber/:session",
    "get -> /SendTradeCommands/:session,:cmd,:symbol,:lots,:price,:stoploss,:profit",
    "post -> /SendTradeCommands",
    "get -> /SendTradeCommands2/:session,:cmd,:symbol1,:lots,:cmd2,:symbol2,:lots2,:cmd3,:symbol3,:lots3",
    "post -> /SendTradeCommands2",
    "get -> /SetOrderStatus/:session,:status",
    "put -> /SetOrderStatus",
    "get -> /GetOrderStatus/:session",
    "get -> /GetTradePrice/:session",
    "get -> /GetTradeLots/:session",
    "get -> /GetTradeLots2/:session",
    "get -> /GetTradeLots3/:session",
    "get -> /GetTradeStoploss/:session",
    "get -> /GetTradeTakeprofit/:session",
    "delete -> /ResetTradeCommand/:session",
    "get -> /GetTradeCurrency/:session",
    "get -> /GetTradeCurrency2/:session",
    "get -> /GetTradeCurrency3/:session",
    "get -> /GetSwapRateLong/:session",
    "get -> /GetSwapRateShort/:session",
    "get -> /SetSwapRateLong/:session,:rate",
    "get -> /SetSwapRateShort/:session,:rate",
    "get -> /PipSize/:session",
    "get -> /MovingAverages/:session",
    "get -> /TechnicalIndicators/:session,:period"

# Testing with Postman
Download the POSTMAN tool to test the API. You must initialize a session first.

    1. Invoke the Initialize method first, for a single currency.
    2. If testing arbitrage, invoke InitializeCurrency1, InitializeCurrency2 and InitializeCurrency3 in addition to InitializeCurrency

# Contact us
The best contact method is via email at presspage.entertainment@gmail.com

# License
Creative Commons Attribution 4.0

# EOL or End-of-Life Doctrine
When a piece of software is useful, there should never be an EOL doctrine. The intention for this package is to achieve immoratlity ;).

At some point of time in the future, this package may appear to be dead and abandon. The opposite will be true!

When this project reaches that stage, this package has matured to a level where maintenance is no longer needed.

When external dependencies are removed from a package, then an immortal package lifespan is achievable!

Patrick Ingle
Developer

