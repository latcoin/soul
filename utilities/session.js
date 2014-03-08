
var connect = require('connect')
  , http = require('http');

// expire sessions within a minute
// /favicon.ico is ignored, and will not 
// receive req.session

http.createServer(

  connect()
  .use(connect.cookieParser())
  .use(connect.session({ secret: 'keyboard cat', cookie: { maxAge: 30000 }}))
  .use(connect.favicon())
  .use(function(req, res, next){
    var sess = req.session;
    if (sess.views) {
    } else {
    }
    console.log('expires in: ' + (sess.cookie.maxAge / 1000) + 's');
    res.end();
  })

).listen(8080);


