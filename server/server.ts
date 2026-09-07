import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { Server } from 'socket.io';
import { join } from 'node:path';
import { applyAction, addPlayer, getState, loadState, removePlayer, saveState, tick } from './state.js';
import type { ClientAction, ClientToServerEvents, HospitalState, PlayerRole, ServerToClientEvents } from '../src/types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin: true, credentials: false } });
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));
app.get('/api/state', (_req, res) => res.json(getState()));
const dist = join(process.cwd(), 'dist');
if (existsSync(dist)) app.use(express.static(dist));

function broadcast(state:HospitalState){ io.emit('state', state); }

io.on('connection', socket => {
  socket.on('join', ({name, role}:{name:string;role:PlayerRole}) => {
    const safeName=name.trim().slice(0,32)||'Spieler';
    const player={id:socket.id,name:safeName,role,connectedAt:Date.now(),lastSeen:Date.now()};
    addPlayer(player); socket.data.playerId=socket.id; socket.emit('state',getState()); socket.emit('notice',`Willkommen ${safeName} · Rolle: ${role}`); broadcast(getState());
  });
  socket.on('pingState',()=>socket.emit('state',getState()));
  socket.on('action',(action:ClientAction)=>{
    try { const name=getState().players.find(p=>p.id===socket.id)?.name; const state=applyAction(action,name); broadcast(state); void saveState(); }
    catch(error){ socket.emit('error',error instanceof Error?error.message:'Aktion konnte nicht ausgeführt werden'); }
  });
  socket.on('disconnect',()=>{removePlayer(socket.id);broadcast(getState());void saveState();});
});

await loadState();
setInterval(()=>{tick(1000);broadcast(getState());},1000);
setInterval(()=>void saveState(),15000);
httpServer.listen(port,'0.0.0.0',()=>console.log(`Krankenhaus-Server läuft auf :${port}`));

process.on('SIGTERM',async()=>{await saveState();httpServer.close(()=>process.exit(0));});
process.on('SIGINT',async()=>{await saveState();httpServer.close(()=>process.exit(0));});
