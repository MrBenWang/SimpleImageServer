var express = require('express');
//var path = require('path');
var logger = require('morgan');
// var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var routes = require('./routes/route');

// 设置监听数
var events = require('events');   
var ee = new events.EventEmitter();
ee.setMaxListeners(100);

// view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers
var accessLogfile = require('fs').createWriteStream('access.log',{flags:'a'});
app.use(logger("combined",{stream:accessLogfile}));
process.on('uncaughtException', function(err) {
    var meta = '[' + new Date() + ']'  + '\n';
    accessLogfile.write(app.get('env') + meta + err.stack + '\n');
    console.error('Error caught in uncaughtException event:', err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;
