const https = require('http')
const fs = require('fs')
const WebSocketServer = require('ws').Server

const wsPort = 8080

const httpsServer = https
  .createServer({
    key: fs.readFileSync('key.pem', 'utf8'),
    cert: fs.readFileSync('cert.pem', 'utf8'),
  })
  .listen(wsPort)

const wss = new WebSocketServer({ server: httpsServer })

wss.on('connection', (ws, req) => {
  let connectionId = req.headers['sec-websocket-key']

  ws.on('message', message => {
    console.log(message)
    // send data to --> Vosk API //Google Speech API // CommonVoice // ...
    // --> gives text back (transcription)

    const vosk = require('vosk')
    if (SPEECH_METHOD === 'vosk') {
      vosk.setLogLevel(-1)
      // MODELS: https://alphacephei.com/vosk/models
      const model = new vosk.Model('vosk_models/en')
      const rec = new vosk.Recognizer({ model: model, sampleRate: 48000 })
      vosk._rec_ = rec
      // dev reference: https://github.com/alphacep/vosk-api/blob/master/nodejs/index.js
    }
  })
  console.log('Speaker connected')
})

wss.on('close', () => {
  console.log('Speaker disconnected')
})

console.log('Listening on port:', wsPort)
