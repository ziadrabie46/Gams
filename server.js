const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const rooms = new Map();
app.use(express.static(__dirname));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
io.on('connection', socket => {
  socket.on('joinRoom', ({ room='DEFAULT', name='لاعب', x=0, z=0, rot=0 }={}) => {
    room=String(room).slice(0,32).toUpperCase(); socket.join(room); socket.data.room=room; socket.data.name=String(name).slice(0,12);
    if(!rooms.has(room)) rooms.set(room,new Map());
    const player={id:socket.id,name:socket.data.name,x:Number(x)||0,z:Number(z)||0,rot:Number(rot)||0};
    rooms.get(room).set(socket.id,player);
    socket.emit('roomState',{players:[...rooms.get(room).values()].filter(p=>p.id!==socket.id)});
    socket.to(room).emit('playerJoined',player);
  });
  socket.on('playerMove', data => { const room=rooms.get(socket.data.room), p=room?.get(socket.id); if(!p)return; p.x=Number(data?.x)||0; p.z=Number(data?.z)||0; p.rot=Number(data?.rot)||0; socket.to(socket.data.room).emit('playerMove',p); });
  socket.on('taskCompleted', data => socket.to(socket.data.room||'').emit('taskCompleted',{id:socket.id,name:socket.data.name,count:Number(data?.count)||0}));
  socket.on('disconnect',()=>{const room=rooms.get(socket.data.room); if(!room)return; room.delete(socket.id); socket.to(socket.data.room).emit('playerLeft',{id:socket.id}); if(!room.size)rooms.delete(socket.data.room);});
});
const port=process.env.PORT||3000;
server.listen(port,'0.0.0.0',()=>console.log(`multiplayer server listening on ${port}`));
