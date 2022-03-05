if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
} //放在最前面好安心
const express = require('express')
const cors = require('cors')
const passport = require('./config/passport')
const app = express()
const port = process.env.PORT || 3000

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);



app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json()) // POST json格式
app.use(passport.initialize())



require('./routes')(app)
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/app.html');
});
app.get('/', (req, res) => res.send('Hello World!'))

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


app.listen(port, () => console.log(`Example app listening on port ${port}!`))

server.listen(3001, () => {
  console.log('listening on *:3001');
});

module.exports = app
