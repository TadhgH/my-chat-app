var app = require('express')(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    mongoose = require('mongoose');

var	users = {};

http.listen(1337, function(){
  console.log('listening on *:1337');
});

//can change db port here
mongoose.connect('mongodb://localhost/chat', function(err){
  if(err)console.log("error: "+err);
  else{ console.log("Success");}
});

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

var chatSchema = mongoose.Schema({
  nick: String,
  msg: String,
  created: {
    type: Date,
    default: Date.now
  }
});

var Chat = mongoose.model('Message', chatSchema);

/*app.get('/hello', function(req, res){
  res.sendFile(__dirname + '/hello.json');
	//console.log(req);
  //console.log("res"+res)
});

app.post('/hello', function(req, res){
  //res.sendFile(__dirname + '/hello.json');
	console.log(req.data);
  //console.log("res"+res)
});*/

io.on('connection', function(socket){
  var query = Chat.find({});//put conditions in curly braces at start
  query.sort('-created').limit(8).exec(function(err, docs){
    if(err)throw err;
    socket.emit("load-m", docs);
  });

  /*Chat.find({}, function(err, docs){//put conditions in curly braces at start
    if(err)throw err;
    socket.emit("load-m", docs);
  });*/

	socket.on('new user', function(data, callback){
		if (data in users){
			callback(false);
		} else{
			callback(true);
			socket.nickname = data;
			users[socket.nickname] = socket;
      emitNicknames();
		}
	});

	socket.on('send message', function(data, callback){
    var msg = data.trim();
    if(msg.substr(0, 3) === '/w '){
      msg = msg.substr(3);
      var ind = msg.indexOf(' ');

      if(ind !== -1){
        var name = msg.substring(0, ind);
        var msg = msg.substring(ind+1);

        if(name in users){
          //console.log(users+"");
          users[name].emit('whisper', {msg: msg, nick: socket.nickname});
        }else{
          callback("error: user does not exist");
        }

      } else{
        callback("error: message not entered");
      }

    }else {
      var newMsg = new Chat({
        nick: socket.nickname,
        msg: msg
      });
      newMsg.save(function(err){
        if(err)throw err;
        io.sockets.emit('new message', {msg: msg, nick: socket.nickname});
      });
    }
	});

  socket.on('disconnect', function(){
    if(!socket.nickname) return;
      delete users[socket.nickname];
      emitNicknames();

  });

  function emitNicknames(){
    io.emit('usernames', Object.keys(users));
    //console.log(Object.keys(users));
  }

});
